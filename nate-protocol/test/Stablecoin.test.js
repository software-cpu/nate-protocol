const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Nate Protocol - Stablecoin Transition", function () {
    let nateToken, stabilityEngine, mockOracle;
    let owner, user1;

    // Constants
    const MIN_COLLATERAL_RATIO = 150n; // 150%
    const PRICE_PRECISION = 100000000n; // 1e8
    const ETH_PRICE = 250000000000n; // $2500 * 1e8

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // 1. Deploy Mock Oracle
        const MockOracleFactory = await ethers.getContractFactory("MockLifeOracle");
        mockOracle = await MockOracleFactory.deploy();

        // 2. Deploy Nate Token
        const TokenFactory = await ethers.getContractFactory("NateProtocol");
        nateToken = await TokenFactory.deploy(owner.address);

        // 3. Deploy Stability Engine
        const EngineFactory = await ethers.getContractFactory("StabilityEngine");
        stabilityEngine = await EngineFactory.deploy(await nateToken.getAddress(), await mockOracle.getAddress());

        // 4. Setup Permissions
        // Grant MINTER_ROLE on Token to Engine
        // ADMIN_ROLE is already owner
        // We need to call setStabilityEngine on Token
        await nateToken.setStabilityEngine(await stabilityEngine.getAddress());
    });

    it("Should allow minting when backed by Life Metrics", async function () {
        // 1. Set Life Metrics (e.g. $1.5M Valuation)
        const valuation = ethers.parseEther("1500000"); // 1,500,000 * 1e18
        await mockOracle.setTotalValue(valuation);

        // 2. Mint 1M Tokens (Total Value $1.5M / Supply 1M = 150% CR)
        const mintAmount = ethers.parseEther("1000000"); // 1M NATE

        await stabilityEngine.mint(mintAmount);

        expect(await nateToken.balanceOf(owner.address)).to.equal(mintAmount);
    });

    it("Should fail minting if undercollateralized", async function () {
        // 1. Set Life Metrics ($1.4M)
        const valuation = ethers.parseEther("1400000");
        await mockOracle.setTotalValue(valuation);

        // 2. Try to Mint 1M Tokens (Needs $1.5M)
        const mintAmount = ethers.parseEther("1000000");

        await expect(
            stabilityEngine.mint(mintAmount)
        ).to.be.revertedWith("Undercollateralized mint attempt");
    });

    it("Should allow redemption for ETH", async function () {
        // 1. Fund Treasury with ETH (e.g. 1 ETH = $2500)
        const depositAmount = ethers.parseEther("10"); // 10 ETH
        await owner.sendTransaction({
            to: await stabilityEngine.getAddress(),
            value: depositAmount
        });

        // 2. Mint Tokens first (Need collateral to mint)
        // Provide HUGE human valuation to allow minting
        const valuation = ethers.parseEther("100000000");
        await mockOracle.setTotalValue(valuation);

        const mintAmount = ethers.parseEther("100"); // 100 NATE ($100)
        await stabilityEngine.mint(mintAmount);

        // Transfer to user
        await nateToken.transfer(user1.address, mintAmount);

        // 3. User Redeems 100 NATE
        // Expect to get $100 worth of ETH back.
        // 1 ETH = $2500. $100 = 0.04 ETH.
        const expectedEth = ethers.parseEther("0.04");

        const preBalance = await ethers.provider.getBalance(user1.address);

        // Execute Redeem
        // Connect as user1
        await stabilityEngine.connect(user1).redeem(mintAmount);

        const postBalance = await ethers.provider.getBalance(user1.address);

        // Check balance change (approximate due to gas)
        expect(postBalance - preBalance).to.be.closeTo(expectedEth, ethers.parseEther("0.001"));

        // Check tokens burned
        expect(await nateToken.balanceOf(user1.address)).to.equal(0);
    });
});
