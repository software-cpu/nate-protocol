const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Coverage Audit - Branch & Edge Case Testing", function () {

    async function deployCoverageFixture() {
        const [owner, other] = await ethers.getSigners();

        // 1. NateProtocol
        const TokenFactory = await ethers.getContractFactory("NateProtocol");
        const token = await TokenFactory.deploy(owner.address);
        await token.waitForDeployment();

        // 2. Mock Oracle
        const MockOracleFactory = await ethers.getContractFactory("MockLifeOracle");
        const oracle = await MockOracleFactory.deploy();
        await oracle.waitForDeployment();
        await oracle.setTotalValue(ethers.parseEther("1000000"));

        // 3. Stability Engine
        const EngineFactory = await ethers.getContractFactory("StabilityEngine");
        const engine = await EngineFactory.deploy(await token.getAddress(), await oracle.getAddress());
        await engine.waitForDeployment();
        await token.setStabilityEngine(await engine.getAddress());

        // 4. Task Market
        const MarketFactory = await ethers.getContractFactory("TaskMarket");
        const market = await MarketFactory.deploy(await token.getAddress(), await oracle.getAddress());
        await market.waitForDeployment();

        // 5. Governance Board
        const BoardFactory = await ethers.getContractFactory("GovernanceBoard");
        const board = await BoardFactory.deploy(await engine.getAddress(), await market.getAddress());
        await board.waitForDeployment();
        await engine.setGovernanceBoard(await board.getAddress());

        return { token, oracle, engine, market, board, owner, other };
    }

    describe("NateProtocol Edge Cases", function () {
        it("Should fail to stake 0 tokens", async function () {
            const { token } = await loadFixture(deployCoverageFixture);
            await expect(token.stake(0)).to.be.revertedWith("Amount > 0");
        });

        it("Should fail to stake more than balance", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            await expect(token.connect(other).stake(100)).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to unstake 0 tokens", async function () {
            const { token } = await loadFixture(deployCoverageFixture);
            await expect(token.unstake(0)).to.be.revertedWith("Amount > 0");
        });

        it("Should fail to unstake more than staked", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            await expect(token.connect(other).unstake(100)).to.be.revertedWith("Insufficient staked");
        });

        it("Should only allow Stability Engine to mint/burn via restricted functions", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            await expect(token.connect(other).mint(other.address, 100)).to.be.reverted;
        });
    });

    describe("StabilityEngine Edge Cases", function () {
        it("Should allow unpausing (PAUSER_ROLE/ADMIN)", async function () {
            const { engine, owner } = await loadFixture(deployCoverageFixture);
            await engine.pause();
            expect(await engine.paused()).to.be.true;
            await engine.unpause();
            expect(await engine.paused()).to.be.false;
        });

        it("Should fail expansion mint if amount is 0", async function () {
            const { engine } = await loadFixture(deployCoverageFixture);
            await expect(engine.mint(0)).to.be.revertedWith("Amount must be > 0");
        });

        it("Should fail public mint if amount is 0", async function () {
            const { engine } = await loadFixture(deployCoverageFixture);
            await expect(engine.mintWithCollateral(0)).to.be.revertedWith("Amount must be > 0");
        });

        it("Should test system health views", async function () {
            const { engine } = await loadFixture(deployCoverageFixture);
            expect(await engine.isSystemHealthy()).to.be.true;
            expect(await engine.getCollateralRatio()).to.be.gt(0);
        });

        it("Should fail withdrawal if no fees", async function () {
            const { engine, owner } = await loadFixture(deployCoverageFixture);
            await expect(engine.withdrawEthFees(owner.address)).to.be.revertedWith("No fees");
            await expect(engine.withdrawNateFees(owner.address)).to.be.revertedWith("No NATE fees");
        });
    });

    describe("TaskMarket Edge Cases", function () {
        it("Should reject invalid fee BPS", async function () {
            const { market } = await loadFixture(deployCoverageFixture);
            await expect(market.setProtocolFee(1001)).to.be.revertedWith("Max fee 10%");
        });

        it("Should fail to withdraw fees if 0", async function () {
            const { market, owner } = await loadFixture(deployCoverageFixture);
            await expect(market.withdrawFees(owner.address)).to.be.revertedWith("No fees to withdraw");
        });

        it("Should fail to cancel a non-OPEN task", async function () {
            const { market } = await loadFixture(deployCoverageFixture);
            await market.createTask("Test", 0, 3600);
            await market.cancelTask(1);
            await expect(market.cancelTask(1)).to.be.revertedWith("Cannot cancel");
        });
    });
});
