const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Nate Protocol - End-to-End (E2E) Integration", function () {

    async function deployFullProtocolFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        // 1. Deploy Token
        const TokenFactory = await ethers.getContractFactory("NateProtocol");
        const nateToken = await TokenFactory.deploy(owner.address);
        await nateToken.waitForDeployment();

        // 2. Deploy Mock Oracle
        const MockOracleFactory = await ethers.getContractFactory("MockLifeOracle");
        const mockOracle = await MockOracleFactory.deploy();
        await mockOracle.waitForDeployment();

        // 3. Deploy Stability Engine
        const EngineFactory = await ethers.getContractFactory("StabilityEngine");
        const stabilityEngine = await EngineFactory.deploy(
            await nateToken.getAddress(),
            await mockOracle.getAddress()
        );
        await stabilityEngine.waitForDeployment();

        // 4. Deploy Task Market
        const MarketFactory = await ethers.getContractFactory("TaskMarket");
        const taskMarket = await MarketFactory.deploy(
            await nateToken.getAddress(),
            await mockOracle.getAddress()
        );
        await taskMarket.waitForDeployment();

        // 5. Deploy Governance Board
        const GovernanceFactory = await ethers.getContractFactory("GovernanceBoard");
        const governanceBoard = await GovernanceFactory.deploy(
            await stabilityEngine.getAddress(),
            await taskMarket.getAddress()
        );
        await governanceBoard.waitForDeployment();

        // 6. Setup Permissions & Links
        await nateToken.setStabilityEngine(await stabilityEngine.getAddress());
        await stabilityEngine.setGovernanceBoard(await governanceBoard.getAddress());

        return {
            nateToken,
            mockOracle,
            stabilityEngine,
            taskMarket,
            governanceBoard,
            owner,
            user1,
            user2
        };
    }

    describe("Protocol Lifecycle Scenario", function () {

        it("Should execute a full protocol interaction cycle", async function () {
            const {
                nateToken,
                mockOracle,
                stabilityEngine,
                taskMarket,
                governanceBoard,
                owner,
                user1,
                user2
            } = await loadFixture(deployFullProtocolFixture);

            // --- Phase 1: Human Capital Growth ---
            // Oracle reports $2,000 Human Value
            const humanValue = ethers.parseEther("2000");
            await mockOracle.setTotalValue(humanValue);

            // --- Phase 2: User Onboarding (Minting) ---
            // User1 mints 1000 NATE
            // 150% CR -> $1500 collateral needed
            // ETH @ $2500 -> 1500/2500 = 0.06 ETH
            const mintAmount = ethers.parseEther("1000");
            const collateral = ethers.parseEther("0.6");

            await stabilityEngine.connect(user1).mintWithCollateral(mintAmount, { value: collateral });
            const bal = await nateToken.balanceOf(user1.address);
            console.log("Balance after mint:", ethers.formatEther(bal));
            const mintFee = mintAmount * 50n / 10000n;
            expect(await nateToken.balanceOf(user1.address)).to.equal(mintAmount - mintFee);

            // --- Phase 3: Marketplace Interaction ---
            // owner logs a task in TaskMarket
            // TimeHorizon.IMMEDIATE is 0
            await taskMarket.createTask("Improve E2E Tests", 0, 3600);

            // User1 stakes NATE to get voting power
            await nateToken.connect(user1).stake(mintAmount - mintFee);
            const votingPower = await nateToken.getVotingPower(user1.address);
            expect(votingPower).to.be.gt(0);

            // --- Phase 4: Stability & Redemption ---
            const stats = await stabilityEngine.getSystemStats();
            expect(stats.healthy).to.be.true;

            // User1 unstakes and redeems half
            await nateToken.connect(user1).unstake(mintAmount - mintFee);
            const burnAmount = ethers.parseEther("500");

            // Correct logic (from StabilityEngine upgrade):
            // ethToReturn = (_amountNate * 1.5 * precision) / (100 * ethPrice)
            // (500 * 1.5 * 1e8) / (100 * 2500 * 1e8) = 750 / 250000 = 0.003? 
            // Wait, NATE is 1e18. 
            // (500e18 * 1.5 * 1e8) / (100 * 2500 * 1e8) = 750e18 / 250000 = 0.003e18?
            // No, 1500 USD value for 1000 NATE.
            // 750 USD value for 500 NATE.
            // 750 / 2500 = 0.3 ETH. Correct.

            const expectedEthReturn = ethers.parseEther("0.3");
            const redeemFee = expectedEthReturn * 50n / 10000n;
            const netEthReturn = expectedEthReturn - redeemFee;

            const preBalance = await ethers.provider.getBalance(user1.address);
            const tx = await stabilityEngine.connect(user1).burn(burnAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const postBalance = await ethers.provider.getBalance(user1.address);
            expect(postBalance - preBalance).to.be.closeTo(netEthReturn - gasUsed, ethers.parseEther("0.001"));

            // Final checks
            // 995 - 500 = 495
            expect(await nateToken.balanceOf(user1.address)).to.equal(ethers.parseEther("495"));
            expect(await stabilityEngine.totalETHCollateral()).to.equal(ethers.parseEther("0.3"));
        });
    });
});
