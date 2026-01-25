const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NateProtocol", function () {
  let nate, owner, council, treasury, user1, user2;
  const INITIAL_SUPPLY = ethers.parseEther("10000000"); // 10M
  
  beforeEach(async function () {
    [owner, council, treasury, user1, user2] = await ethers.getSigners();
    
    const NateProtocol = await ethers.getContractFactory("NateProtocol");
    nate = await NateProtocol.deploy(council.address, treasury.address);
    await nate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await nate.name()).to.equal("Nate Execution Protocol");
      expect(await nate.symbol()).to.equal("NATE");
    });

    it("Should distribute tokens correctly", async function () {
      const ownerBalance = await nate.balanceOf(owner.address);
      const contractBalance = await nate.balanceOf(await nate.getAddress());
      const treasuryBalance = await nate.balanceOf(treasury.address);
      
      // 30% to Nate (owner)
      expect(ownerBalance).to.equal((INITIAL_SUPPLY * 30n) / 100n);
      // 50% to contract (community pool)
      expect(contractBalance).to.equal((INITIAL_SUPPLY * 50n) / 100n);
      // 20% to treasury reserve
      expect(treasuryBalance).to.equal((INITIAL_SUPPLY * 20n) / 100n);
    });

    it("Should set council correctly", async function () {
      expect(await nate.communityCouncil()).to.equal(council.address);
    });
  });

  describe("Opportunity Registry", function () {
    it("Should log opportunities", async function () {
      await expect(nate.logOpportunity("JOB", "Senior Dev at Google", ethers.parseEther("200000")))
        .to.emit(nate, "OpportunityLogged")
        .withArgs(1, "JOB", "Senior Dev at Google", ethers.parseEther("200000"));
      
      const opp = await nate.getOpportunity(1);
      expect(opp.description).to.equal("Senior Dev at Google");
      expect(opp.category).to.equal("JOB");
      expect(opp.status).to.equal(0); // Active
    });

    it("Should allow token holders to claim opportunities", async function () {
      // Log opportunity
      await nate.logOpportunity("IDEA", "SaaS startup concept", ethers.parseEther("500000"));
      
      // Transfer some tokens to user1
      await nate.transfer(user1.address, ethers.parseEther("100"));
      
      // User1 claims
      await expect(nate.connect(user1).claimOpportunity(1))
        .to.emit(nate, "OpportunityClaimed")
        .withArgs(1, user1.address);
      
      const opp = await nate.getOpportunity(1);
      expect(opp.executor).to.equal(user1.address);
      expect(opp.status).to.equal(1); // Claimed
    });

    it("Should reject claims from non-holders", async function () {
      await nate.logOpportunity("JOB", "Test opportunity", ethers.parseEther("100000"));
      
      await expect(nate.connect(user2).claimOpportunity(1))
        .to.be.revertedWith("Must hold NATE");
    });

    it("Should track multiple opportunities", async function () {
      await nate.logOpportunity("JOB", "Opportunity 1", ethers.parseEther("100000"));
      await nate.logOpportunity("IDEA", "Opportunity 2", ethers.parseEther("200000"));
      await nate.logOpportunity("CONNECTION", "Opportunity 3", ethers.parseEther("50000"));
      
      expect(await nate.opportunityCount()).to.equal(3);
      
      const activeOps = await nate.getActiveOpportunities();
      expect(activeOps.length).to.equal(3);
    });
  });

  describe("Revenue Distribution", function () {
    it("Should distribute revenue correctly", async function () {
      const amount = ethers.parseEther("10");
      const expectedBuyback = (amount * 2000n) / 10000n;  // 20%
      const expectedTreasury = (amount * 3000n) / 10000n; // 30%
      const expectedOperator = amount - expectedBuyback - expectedTreasury; // 50%
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await expect(nate.connect(user1).distributeRevenue({ value: amount }))
        .to.emit(nate, "RevenueDistributed")
        .withArgs(amount, expectedBuyback, expectedTreasury, expectedOperator);
      
      // Check treasury updated
      expect(await nate.totalTreasuryValue()).to.equal(expectedTreasury);
      
      // Check operator received their share
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedOperator);
    });

    it("Should accept ETH via receive()", async function () {
      const amount = ethers.parseEther("1");
      
      await user1.sendTransaction({
        to: await nate.getAddress(),
        value: amount
      });
      
      expect(await nate.totalTreasuryValue()).to.be.gt(0);
    });
  });

  describe("NAV & Life Metrics", function () {
    it("Should update life metrics", async function () {
      await nate.updateLifeMetrics(
        ethers.parseEther("300000"),  // time
        ethers.parseEther("200000"),  // skill
        ethers.parseEther("150000"),  // network
        ethers.parseEther("250000")   // future earnings
      );
      
      const metrics = await nate.currentMetrics();
      expect(metrics.timeValue).to.equal(ethers.parseEther("300000"));
      expect(metrics.skillValue).to.equal(ethers.parseEther("200000"));
    });

    it("Should calculate NAV correctly", async function () {
      // Set metrics: 900K total
      await nate.updateLifeMetrics(
        ethers.parseEther("300000"),
        ethers.parseEther("200000"),
        ethers.parseEther("150000"),
        ethers.parseEther("250000")
      );
      
      // Add treasury: 100K
      await nate.distributeRevenue({ value: ethers.parseEther("333333.33") }); // 30% = ~100K
      
      const totalBacking = await nate.getTotalBacking();
      const nav = await nate.calculateNAV();
      
      // NAV = totalBacking / totalSupply
      expect(nav).to.be.gt(0);
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      // Give user1 some tokens
      await nate.transfer(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow staking", async function () {
      await nate.connect(user1).stake(ethers.parseEther("500"));
      
      expect(await nate.stakedBalance(user1.address)).to.equal(ethers.parseEther("500"));
      expect(await nate.totalStaked()).to.equal(ethers.parseEther("500"));
    });

    it("Should allow unstaking", async function () {
      await nate.connect(user1).stake(ethers.parseEther("500"));
      await nate.connect(user1).unstake(ethers.parseEther("200"));
      
      expect(await nate.stakedBalance(user1.address)).to.equal(ethers.parseEther("300"));
    });

    it("Should calculate voting power with time multiplier", async function () {
      await nate.connect(user1).stake(ethers.parseEther("1000"));
      
      // Initial: 1000 * 100% = 1000
      let power = await nate.getVotingPower(user1.address);
      expect(power).to.equal(ethers.parseEther("1000"));
      
      // After 30 days: 1000 * 110% = 1100
      await time.increase(30 * 24 * 60 * 60);
      power = await nate.getVotingPower(user1.address);
      expect(power).to.equal(ethers.parseEther("1100"));
    });

    it("Should cap voting multiplier at 2x", async function () {
      await nate.connect(user1).stake(ethers.parseEther("1000"));
      
      // After 1 year: should cap at 2x
      await time.increase(365 * 24 * 60 * 60);
      const power = await nate.getVotingPower(user1.address);
      expect(power).to.equal(ethers.parseEther("2000")); // Max 2x
    });
  });

  describe("Dead Man's Switch", function () {
    it("Should track last active timestamp", async function () {
      const before = await nate.lastActiveTimestamp();
      
      await nate.logOpportunity("TEST", "Test", ethers.parseEther("1"));
      
      const after = await nate.lastActiveTimestamp();
      expect(after).to.be.gte(before);
    });

    it("Should allow crisis activation after timeout", async function () {
      // Fast forward 31 days
      await time.increase(31 * 24 * 60 * 60);
      
      await expect(nate.connect(council).activateCrisisMode())
        .to.emit(nate, "CrisisModeActivated");
      
      expect(await nate.crisisModeActive()).to.be.true;
      expect(await nate.owner()).to.equal(council.address);
    });

    it("Should reject early crisis activation", async function () {
      await expect(nate.connect(council).activateCrisisMode())
        .to.be.revertedWith("Nate is still active");
    });

    it("Should allow owner to prove liveness", async function () {
      await time.increase(29 * 24 * 60 * 60);
      
      await nate.proveLiveness();
      
      // Now council can't activate for another 30 days
      await time.increase(2 * 24 * 60 * 60);
      await expect(nate.connect(council).activateCrisisMode())
        .to.be.revertedWith("Nate is still active");
    });

    it("Should show time to crisis", async function () {
      const ttc = await nate.timeToCrisis();
      expect(ttc).to.be.closeTo(30n * 24n * 60n * 60n, 10n);
    });
  });

  describe("Admin Functions", function () {
    it("Should release community tokens", async function () {
      await nate.releaseCommunityTokens(user1.address, ethers.parseEther("100000"));
      
      expect(await nate.balanceOf(user1.address)).to.equal(ethers.parseEther("100000"));
    });

    it("Should allow treasury withdrawal with reason", async function () {
      // First add to treasury
      await nate.distributeRevenue({ value: ethers.parseEther("10") });
      
      const treasuryBefore = await nate.totalTreasuryValue();
      
      await expect(nate.withdrawTreasury(
        user1.address,
        ethers.parseEther("1"),
        "Emergency fund for opportunity execution"
      )).to.emit(nate, "TreasuryWithdrawal");
      
      expect(await nate.totalTreasuryValue()).to.equal(treasuryBefore - ethers.parseEther("1"));
    });

    it("Should update council", async function () {
      await nate.setCouncil(user1.address);
      expect(await nate.communityCouncil()).to.equal(user1.address);
    });
  });

  describe("System Stats", function () {
    it("Should return comprehensive stats", async function () {
      // Set up some state
      await nate.updateLifeMetrics(
        ethers.parseEther("100000"),
        ethers.parseEther("100000"),
        ethers.parseEther("100000"),
        ethers.parseEther("100000")
      );
      await nate.logOpportunity("TEST", "Test", ethers.parseEther("1"));
      
      const [supply, treasury, backing, nav, burned, staked, opportunities, crisis] = 
        await nate.getSystemStats();
      
      expect(supply).to.equal(INITIAL_SUPPLY);
      expect(opportunities).to.equal(1n);
      expect(crisis).to.be.false;
    });
  });
});
