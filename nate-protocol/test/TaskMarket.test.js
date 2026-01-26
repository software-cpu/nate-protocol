const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TaskMarket", function () {
    let market, token, owner, user1, user2, oracle;

    beforeEach(async function () {
        [owner, oracle, user1, user2] = await ethers.getSigners();

        // Deploy Token
        const NateProtocol = await ethers.getContractFactory("NateProtocol");
        token = await NateProtocol.deploy(owner.address);
        await token.waitForDeployment();

        // Grant MINTER_ROLE to owner for testing
        const MINTER_ROLE = await token.MINTER_ROLE();
        await token.grantRole(MINTER_ROLE, owner.address);

        // Mint tokens to users
        await token.mint(user1.address, ethers.parseEther("1000"));
        await token.mint(user2.address, ethers.parseEther("1000"));

        // Deploy Market
        const TaskMarket = await ethers.getContractFactory("TaskMarket");
        market = await TaskMarket.deploy(await token.getAddress(), oracle.address);
        await market.waitForDeployment();
    });

    describe("Task Creation", function () {
        it("Should create a task", async function () {
            await market.createTask("Ship Mainnet", 1, 86400); // DAILY, 24hrs

            const task = await market.tasks(1);
            expect(task.description).to.equal("Ship Mainnet");
            expect(task.horizon).to.equal(1); // DAILY
            expect(task.status).to.equal(0); // OPEN
        });
    });

    describe("Betting", function () {
        beforeEach(async function () {
            await market.createTask("Deep Work 6hrs", 1, 86400);
        });

        it("Should allow betting on YES", async function () {
            await token.connect(user1).approve(await market.getAddress(), ethers.parseEther("100"));
            await market.connect(user1).bet(1, true, ethers.parseEther("100"));

            const task = await market.tasks(1);
            expect(task.yesPool).to.equal(ethers.parseEther("100"));

            const position = await market.positions(1, user1.address);
            expect(position.yesAmount).to.equal(ethers.parseEther("100"));
        });

        it("Should allow betting on NO", async function () {
            await token.connect(user2).approve(await market.getAddress(), ethers.parseEther("50"));
            await market.connect(user2).bet(1, false, ethers.parseEther("50"));

            const task = await market.tasks(1);
            expect(task.noPool).to.equal(ethers.parseEther("50"));
        });

        it("Should calculate odds correctly", async function () {
            await token.connect(user1).approve(await market.getAddress(), ethers.parseEther("300"));
            await market.connect(user1).bet(1, true, ethers.parseEther("300"));

            await token.connect(user2).approve(await market.getAddress(), ethers.parseEther("100"));
            await market.connect(user2).bet(1, false, ethers.parseEther("100"));

            const [yesPercent, noPercent] = await market.getOdds(1);
            expect(yesPercent).to.equal(75); // 300/400 = 75%
            expect(noPercent).to.equal(25);  // 100/400 = 25%
        });
    });

    describe("Resolution & Rewards", function () {
        beforeEach(async function () {
            await market.createTask("Test Task", 0, 7200); // IMMEDIATE, 2hrs

            // User1 bets YES (500 NATE)
            await token.connect(user1).approve(await market.getAddress(), ethers.parseEther("500"));
            await market.connect(user1).bet(1, true, ethers.parseEther("500"));

            // User2 bets NO (300 NATE)
            await token.connect(user2).approve(await market.getAddress(), ethers.parseEther("300"));
            await market.connect(user2).bet(1, false, ethers.parseEther("300"));
        });

        it("Should resolve task (YES outcome)", async function () {
            await market.resolveTask(1, true); // YES wins

            const task = await market.tasks(1);
            expect(task.status).to.equal(2); // RESOLVED
            expect(task.outcome).to.be.true;
        });

        it("Should distribute rewards to YES winner", async function () {
            await market.resolveTask(1, true);

            const balanceBefore = await token.balanceOf(user1.address);
            await market.connect(user1).claimReward(1);
            const balanceAfter = await token.balanceOf(user1.address);

            // User1 bet 500 on YES, total pool = 800
            // User1 wins entire pool: 800 NATE
            const profit = balanceAfter - balanceBefore;
            expect(profit).to.equal(ethers.parseEther("800"));
        });

        it("Should reject claims from NO losers", async function () {
            await market.resolveTask(1, true);

            await expect(
                market.connect(user2).claimReward(1)
            ).to.be.revertedWith("Nothing to claim");
        });

        it("Should prevent double claims", async function () {
            await market.resolveTask(1, true);

            await market.connect(user1).claimReward(1);

            await expect(
                market.connect(user1).claimReward(1)
            ).to.be.revertedWith("Already claimed");
        });
    });
});
