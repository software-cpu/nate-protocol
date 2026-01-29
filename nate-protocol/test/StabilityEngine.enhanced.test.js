const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StabilityEngine - Enhanced Test Suite", function () {

    // ============================================
    // TEST FIXTURES
    // ============================================

    async function deployStabilityEngineFixture() {
        const [owner, user1, user2, user3, oracle, governance] = await ethers.getSigners();

        // Deploy NateProtocol Token
        const NateProtocol = await ethers.getContractFactory("NateProtocol");
        const nateToken = await NateProtocol.deploy(owner.address);
        await nateToken.waitForDeployment();

        // Deploy MockLifeOracle for predictable testing
        const MockLifeOracle = await ethers.getContractFactory("MockLifeOracle");
        const lifeOracle = await MockLifeOracle.deploy();
        await lifeOracle.waitForDeployment();

        // Deploy StabilityEngine
        const StabilityEngine = await ethers.getContractFactory("StabilityEngine");
        const engine = await StabilityEngine.deploy(
            await nateToken.getAddress(),
            await lifeOracle.getAddress()
        );
        await engine.waitForDeployment();

        // Setup Permissions
        await nateToken.setStabilityEngine(await engine.getAddress());

        // Initialize oracle with some human value to make system healthy
        const initialHumanValue = ethers.parseEther("1000"); // $1000 human value
        await lifeOracle.setTotalValue(initialHumanValue);

        return {
            nateToken,
            lifeOracle,
            engine,
            owner,
            user1,
            user2,
            user3,
            oracle,
            governance
        };
    }

    // ============================================
    // DEPLOYMENT TESTS
    // ============================================

    describe("Deployment", function () {

        it("Should deploy all contracts successfully", async function () {
            const { nateToken, lifeOracle, engine } = await loadFixture(deployStabilityEngineFixture);

            expect(await nateToken.getAddress()).to.be.properAddress;
            expect(await lifeOracle.getAddress()).to.be.properAddress;
            expect(await engine.getAddress()).to.be.properAddress;
        });

        it("Should set correct initial state", async function () {
            const { engine, nateToken, lifeOracle, owner } = await loadFixture(deployStabilityEngineFixture);

            expect(await engine.nateToken()).to.equal(await nateToken.getAddress());
            expect(await engine.lifeOracle()).to.equal(await lifeOracle.getAddress());
            expect(await engine.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero ETH collateral and supply", async function () {
            const { engine } = await loadFixture(deployStabilityEngineFixture);

            expect(await engine.totalETHCollateral()).to.equal(0);
            const stats = await engine.getSystemStats();
            expect(stats.supply).to.equal(0);
        });
    });

    // ============================================
    // MINTING TESTS
    // ============================================

    describe("Minting", function () {

        it("Should mint tokens with correct collateral", async function () {
            const { engine, nateToken, user1 } = await loadFixture(deployStabilityEngineFixture);

            const mintAmount = ethers.parseEther("100"); // 100 $NATE ($100)
            // Required: 150% CR -> $150 collateral
            // $2500 per ETH -> 150/2500 = 0.06 ETH
            const requiredCollateral = ethers.parseEther("0.06");

            await engine.connect(user1).mintWithCollateral(mintAmount, { value: requiredCollateral });

            const fee = mintAmount * 50n / 10000n;
            const netAmount = mintAmount - fee;
            expect(await nateToken.balanceOf(user1.address)).to.equal(netAmount);
            expect(await engine.userCollateralDeposits(user1.address)).to.equal(requiredCollateral);
        });

        it("Should reject mint with insufficient collateral", async function () {
            const { engine, user1 } = await loadFixture(deployStabilityEngineFixture);

            const mintAmount = ethers.parseEther("100");
            const insufficientCollateral = ethers.parseEther("0.05"); // Should be 0.06

            await expect(
                engine.connect(user1).mintWithCollateral(mintAmount, { value: insufficientCollateral })
            ).to.be.revertedWith("Insufficient collateral");
        });

        it("Should refund excess ETH sent", async function () {
            const { engine, user1 } = await loadFixture(deployStabilityEngineFixture);

            const mintAmount = ethers.parseEther("100");
            const requiredCollateral = ethers.parseEther("0.06");
            const excessETH = ethers.parseEther("0.1");

            const balanceBefore = await ethers.provider.getBalance(user1.address);

            // We subtract gas in the expectation
            const tx = await engine.connect(user1).mintWithCollateral(mintAmount, { value: excessETH });
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(user1.address);

            // Expected = Before - RequiredCollateral - Gas
            const expectedBalance = balanceBefore - requiredCollateral - gasUsed;
            expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
        });

        it("Should prevent reentrancy attacks on mint", async function () {
            const { engine, user1 } = await loadFixture(deployStabilityEngineFixture);

            const MaliciousContract = await ethers.getContractFactory("MaliciousMinter");
            const malicious = await MaliciousContract.deploy(await engine.getAddress());

            await expect(
                malicious.attack({ value: ethers.parseEther("1") })
            ).to.be.reverted; // ReentrancyGuard: reentrant call or similar
        });
    });

    // ============================================
    // BURNING/REDEMPTION TESTS
    // ============================================

    describe("Burning/Redemption", function () {

        it("Should burn tokens and return collateral", async function () {
            const { engine, nateToken, user1 } = await loadFixture(deployStabilityEngineFixture);

            const mintAmount = ethers.parseEther("100");
            const collateral = ethers.parseEther("0.06");
            await engine.connect(user1).mintWithCollateral(mintAmount, { value: collateral });

            const burnAmount = ethers.parseEther("50");
            const expectedReturn = collateral / 2n;

            const balanceBefore = await ethers.provider.getBalance(user1.address);

            const tx = await engine.connect(user1).burn(burnAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(user1.address);

            const redeemFee = expectedReturn * 50n / 10000n;
            const netReturn = expectedReturn - redeemFee;

            expect(await nateToken.balanceOf(user1.address)).to.equal(ethers.parseEther("49.5"));
            expect(balanceAfter).to.be.closeTo(
                balanceBefore + netReturn - gasUsed,
                ethers.parseEther("0.0001")
            );
        });
    });

    // ============================================
    // EMERGENCY FUNCTIONS TESTS
    // ============================================

    describe("Emergency Functions", function () {

        it("Should allow emergency withdrawal when paused", async function () {
            const { engine, nateToken, owner, user1 } = await loadFixture(deployStabilityEngineFixture);

            await engine.connect(user1).mintWithCollateral(ethers.parseEther("100"), {
                value: ethers.parseEther("0.06")
            });

            await engine.connect(owner).pause();

            const balanceBefore = await ethers.provider.getBalance(user1.address);
            const tx = await engine.connect(user1).emergencyWithdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(user1.address);

            expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
            expect(await nateToken.balanceOf(user1.address)).to.equal(0);
        });
    });
});
