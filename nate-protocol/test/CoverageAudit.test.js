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
            await expect(token.stake(0)).to.be.revertedWith("Cannot stake 0");
        });

        it("Should fail to stake more than balance", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            await expect(token.connect(other).stake(100)).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail to unstake 0 tokens", async function () {
            const { token } = await loadFixture(deployCoverageFixture);
            await expect(token.unstake(0)).to.be.revertedWith("Cannot unstake 0");
        });

        it("Should fail to unstake more than staked", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            await expect(token.connect(other).unstake(100)).to.be.revertedWith("Insufficient staked");
        });

        it("Should only allow Stability Engine to mint/burn via restricted functions", async function () {
            const { token, other } = await loadFixture(deployCoverageFixture);
            const MINTER_ROLE = await token.MINTER_ROLE();
            await expect(token.connect(other).mint(other.address, 100))
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
                .withArgs(other.address, MINTER_ROLE);

            await expect(token.connect(other)["burn(address,uint256)"](other.address, 100))
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
                .withArgs(other.address, MINTER_ROLE);
        });

        it("Should handle voting power with time multiplier", async function () {
            const { token, engine, owner } = await loadFixture(deployCoverageFixture);
            await engine.mintWithCollateral(ethers.parseEther("100"), { value: ethers.parseEther("0.1") });
            const amountToStake = await token.balanceOf(owner.address);
            await token.stake(amountToStake);

            // T=0 duration
            expect(await token.getVotingPower(owner.address)).to.equal(amountToStake);

            // T=30 days (1.1x multiplier)
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            expect(await token.getVotingPower(owner.address)).to.equal(amountToStake * 110n / 100n);

            // T=365 days (Cap at 2.0x)
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            expect(await token.getVotingPower(owner.address)).to.equal(amountToStake * 2n);
        });

        it("Should manage opportunities", async function () {
            const { token, engine, owner, other } = await loadFixture(deployCoverageFixture);
            await token.logOpportunity("Dev", "Code Coverage", ethers.parseEther("500"));

            // Claiming needs NATE
            await expect(token.connect(other).claimOpportunity(1)).to.be.revertedWith("Must hold NATE");

            // Give some tokens to other
            await engine.mintWithCollateral(ethers.parseEther("10"), { value: ethers.parseEther("0.01") });
            const ownerBalance = await token.balanceOf(owner.address);
            await token.transfer(other.address, ownerBalance);

            await token.connect(other).claimOpportunity(1);

            const active = await token.getActiveOpportunities();
            expect(active.length).to.equal(0);

            // Mark executed
            await token.markExecuted(1, ethers.parseEther("500"));
            const opp = await token.opportunities(1);
            expect(opp.status).to.equal(2); // Executed
        });
    });

    describe("StabilityEngine Edge Cases", function () {
        it("Should handle system health views", async function () {
            const { engine, oracle, token } = await loadFixture(deployCoverageFixture);

            // Supply 0 -> Healthy, max CR
            const stats = await engine.getSystemStats();
            expect(stats.healthy).to.be.true;
            expect(await engine.isSystemHealthy()).to.be.true;
            expect(await engine.getCollateralRatio()).to.equal(ethers.MaxUint256);
        });

        it("Should fail expansion mint if undercollateralized", async function () {
            const { engine, oracle, owner } = await loadFixture(deployCoverageFixture);
            await oracle.setTotalValue(0);
            await expect(engine.mint(ethers.parseEther("1000")))
                .to.be.revertedWith("System undercollateralized for expansion");
        });

        it("Should allow unpausing (PAUSER_ROLE/ADMIN)", async function () {
            const { engine, owner } = await loadFixture(deployCoverageFixture);
            await engine.pause();
            expect(await engine.paused()).to.be.true;
            await engine.unpause();
            expect(await engine.paused()).to.be.false;
        });

        it("Should fail emergencyWithdraw if not paused", async function () {
            const { engine } = await loadFixture(deployCoverageFixture);
            await expect(engine.emergencyWithdraw()).to.be.revertedWithCustomError(engine, "ExpectedPause");
        });

        it("Should fail withdrawal if not owner", async function () {
            const { engine, other } = await loadFixture(deployCoverageFixture);
            const amount = ethers.parseEther("0.0001");
            await expect(engine.connect(other).withdrawEthFees(other.address)).to.be.reverted;
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
