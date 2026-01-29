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
        const taskMarket = await MarketFactory.deploy(await nateToken.getAddress());
        await taskMarket.waitForDeployment();

        // 5. Deploy Governance Board
        const GovernanceFactory = await ethers.getContractFactory("GovernanceBoard");
        const governanceBoard = await GovernanceFactory.deploy(
            await stabilityEngine.getAddress(),
            await mockOracle.getAddress()
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
            // ETH @ $2500 -> 1500/2500 = 0.6 ETH
            const mintAmount = ethers.parseEther("1000");
            const collateral = ethers.parseEther("0.6");

            await stabilityEngine.connect(user1).mint(mintAmount, { value: collateral });
            expect(await nateToken.balanceOf(user1.address)).to.equal(mintAmount);

            // --- Phase 3: Marketplace Interaction ---
            // owner logs a task in TaskMarket
            const taskValue = ethers.parseEther("100"); // $100 task
            await taskMarket.createTask("Improve E2E Tests", "Engineering", taskValue);

            // User1 stakes NATE to get voting power in nateToken (logic might be in nateToken or Governance)
            // Note: Our NateProtocol.sol has stake() and getVotingPower()
            await nateToken.connect(user1).stake(mintAmount);
            const votingPower = await nateToken.getVotingPower(user1.address);
            expect(votingPower).to.be.gt(0);

            // --- Phase 4: Stability & Redemption ---
            // System remains healthy
            const status = await stabilityEngine.getSystemStats();
            expect(status.healthy).to.be.true;

            // User1 unstakes and redeems half
            await nateToken.connect(user1).unstake(mintAmount);
            const burnAmount = ethers.parseEther("500");
            const expectedEthReturn = ethers.parseEther("0.3"); // Half of 0.6

            const preBalance = await ethers.provider.getBalance(user1.address);
            const tx = await stabilityEngine.connect(user1).burn(burnAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const postBalance = await ethers.provider.getBalance(user1.address);
            expect(postBalance - preBalance).to.be.closeTo(expectedEthReturn - gasUsed, ethers.parseEther("0.001"));

            // Final checks
            expect(await nateToken.balanceOf(user1.address)).to.equal(burnAmount);
            expect(await stabilityEngine.totalETHCollateral()).to.equal(ethers.parseEther("0.3"));
        });
    });
});
