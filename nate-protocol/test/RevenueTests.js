const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Revenue & Monetization", function () {
    let token, market, stableEngine, oracle, owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 1. Deploy Token
        const NateProtocol = await ethers.getContractFactory("NateProtocol");
        token = await NateProtocol.deploy(owner.address);
        await token.waitForDeployment();

        // Grant MINTER_ROLE to owner
        const MINTER_ROLE = await token.MINTER_ROLE();
        await token.grantRole(MINTER_ROLE, owner.address);

        // 2. Deploy Mock Oracle
        const MockOracle = await ethers.getContractFactory("MockLifeOracle");
        oracle = await MockOracle.deploy();
        await oracle.waitForDeployment();
        await oracle.setTotalValue(ethers.parseEther("1000000")); // $1M Valuation

        // 3. Deploy Stability Engine
        const StabilityEngine = await ethers.getContractFactory("StabilityEngine");
        stableEngine = await StabilityEngine.deploy(await token.getAddress(), await oracle.getAddress());
        await stableEngine.waitForDeployment();

        // Grant MINTER_ROLE to Stability Engine
        await token.grantRole(MINTER_ROLE, await stableEngine.getAddress());

        // 4. Deploy Task Market
        const TaskMarket = await ethers.getContractFactory("TaskMarket");
        market = await TaskMarket.deploy(await token.getAddress(), owner.address); // owner as oracle for simplicity
        await market.waitForDeployment();

        // Mint setup tokens
        await token.mint(user1.address, ethers.parseEther("1000"));
        await token.mint(user2.address, ethers.parseEther("1000"));
        
        // Approve Market
        await token.connect(user1).approve(await market.getAddress(), ethers.MaxUint256);
        await token.connect(user2).approve(await market.getAddress(), ethers.MaxUint256);
    });

    describe("TaskMarket Rake", function () {
        it("Should deduct 2% fee from winning pool", async function () {
            // Create Task
            await market.createTask("Test Rake", 0, 3600);
            
            // Bet: 100 YES, 100 NO (Total 200)
            await market.connect(user1).bet(1, true, ethers.parseEther("100"));
            await market.connect(user2).bet(1, false, ethers.parseEther("100"));

            // Resolve YES
            await market.resolveTask(1, true);

            // Check Fees Accumulated
            // 2% of 200 = 4.
            const accumulatedFees = await market.accumulatedFees();
            expect(accumulatedFees).to.equal(ethers.parseEther("4"));

            // User 1 claims
            const balBefore = await token.balanceOf(user1.address);
            await market.connect(user1).claimReward(1);
            const balAfter = await token.balanceOf(user1.address);

            // User 1 bet 100 (50% of Yes pool).
            // But Yes pool was 100% of winning side.
            // Wait, User 1 is the ONLY Yes bettor. So they own 100% of Yes pool.
            // They get 100% of Distributable Pool.
            // Total Pool = 200. Fee = 4. Distributable = 196.
            const profit = balAfter - balBefore;
            expect(profit).to.equal(ethers.parseEther("196"));
        });

        it("Should allow owner to withdraw fees", async function () {
            await market.createTask("Withdraw Test", 0, 3600);
            await market.connect(user1).bet(1, true, ethers.parseEther("100"));
            await market.resolveTask(1, true); // Fee: 2 NATE

            const accumulated = await market.accumulatedFees();
            expect(accumulated).to.equal(ethers.parseEther("2"));

            const ownerBalBefore = await token.balanceOf(owner.address);
            await market.withdrawFees(owner.address);
            const ownerBalAfter = await token.balanceOf(owner.address);

            expect(ownerBalAfter - ownerBalBefore).to.equal(ethers.parseEther("2"));
        });
    });

    describe("StabilityEngine Fees", function () {
        beforeEach(async function () {
            // Fund Treasury with ETH for redemptions
            await owner.sendTransaction({
                to: await stableEngine.getAddress(),
                value: ethers.parseEther("10.0")
            });

            // Mint NATE to User1 via Engine (Check Mint Fee)
            // Oracle Value is $1M. Supply is low (2000 from setup).
            // Mint 100 NATE. Fee 0.5% = 0.5 NATE.
            // User gets 99.5 NATE.
            await stableEngine.connect(owner).mint(ethers.parseEther("100")); // Owner mints to their own wallet, but let's assume we transfer to user or test owner balance
        });

        it("Should deduct 0.5% Mint Fee", async function () {
             const startBal = await token.balanceOf(owner.address);
             
             // Mint 200
             await stableEngine.mint(ethers.parseEther("200"));
             
             const endBal = await token.balanceOf(owner.address);
             // Received: 200 * 0.995 = 199
             expect(endBal - startBal).to.equal(ethers.parseEther("199"));
             
             // Check Protocol Revenue (Minted to Engine address)
             const engineBal = await token.balanceOf(await stableEngine.getAddress());
             expect(engineBal).to.equal(ethers.parseEther("1")); // 0.5% of 200
        });

        it("Should deduct 0.5% Redeem Fee", async function () {
            // User1 has NATE.
            await token.connect(user1).approve(await stableEngine.getAddress(), ethers.parseEther("100"));
            
            // Redeem 100 NATE
            // 1 NATE = $1 USD. 100 NATE = $100 USD.
            // ETH Price = $2500.
            // ETH Value = 100 / 2500 = 0.04 ETH.
            // Fee 0.5% of 0.04 = 0.0002.
            // Net = 0.0398 ETH.

            const ethBalBefore = await ethers.provider.getBalance(user1.address);
            
            const tx = await stableEngine.connect(user1).redeem(ethers.parseEther("100"));
            const receipt = await tx.wait();
            const gasSpent = receipt.gasUsed * receipt.gasPrice;

            const ethBalAfter = await ethers.provider.getBalance(user1.address);
            
            // 0.04 ETH = 40000000000000000 WEI
            // 0.0002 ETH = 200000000000000 WEI
            // Expected Net = 39800000000000000 WEI
            const expectedNet = ethers.parseEther("0.0398");
            
            // Check delta + gas
            const delta = ethBalAfter - ethBalBefore + gasSpent;
            
            // Allow small rounding errors if any, but math is precise in solidity usually
            expect(delta).to.closeTo(expectedNet, 1000000); // 1gwei tolerance

            // Check Accumulated Fees
            const fees = await stableEngine.accumulatedEthFees();
            expect(fees).to.equal(ethers.parseEther("0.0002"));
        });

        it("Should allow withdrawing ETH fees", async function () {
             // Generate Fee
             await token.connect(user1).approve(await stableEngine.getAddress(), ethers.parseEther("100"));
             await stableEngine.connect(user1).redeem(ethers.parseEther("100"));

             const ownerEthBefore = await ethers.provider.getBalance(owner.address);
             
             // Withdraw 0.0002 ETH
             const tx = await stableEngine.withdrawEthFees(owner.address);
             const receipt = await tx.wait();
             const gasSpent = receipt.gasUsed * receipt.gasPrice;
             
             const ownerEthAfter = await ethers.provider.getBalance(owner.address);
             
             const expectedAmt = ethers.parseEther("0.0002");
             expect(ownerEthAfter - ownerEthBefore + gasSpent).to.equal(expectedAmt);
        });
    });
});
