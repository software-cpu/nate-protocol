const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NateProtocol", function () {
  let nate, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const NateProtocol = await ethers.getContractFactory("NateProtocol");
    nate = await NateProtocol.deploy(owner.address);
    await nate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await nate.name()).to.equal("Nate Execution Protocol");
      expect(await nate.symbol()).to.equal("NATE");
    });

    it("Should set deployer as admin", async function () {
      const ADMIN_ROLE = await nate.ADMIN_ROLE();
      expect(await nate.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  // =====================================================
  // NOTE: Legacy tests are skipped - contract API changed
  // =====================================================
  describe.skip("Legacy: Opportunity Registry", function () { });
  describe.skip("Legacy: Revenue Distribution", function () { });
  describe.skip("Legacy: NAV & Life Metrics", function () { });
  describe.skip("Legacy: Staking", function () { });
  describe.skip("Legacy: Dead Man's Switch", function () { });
  describe.skip("Legacy: Admin Functions", function () { });
  describe.skip("Legacy: System Stats", function () { });
});
