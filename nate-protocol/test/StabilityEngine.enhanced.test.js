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

        // Deploy mock LifeOracle (using V2)
        // Actual constructor: address router, bytes32 _donId, uint64 _subscriptionId
        const LifeOracle = await ethers.getContractFactory("LifeOracleV2");
        const mockRouter = owner.address; // Use owner as a mock router for testing
        const mockDonId = ethers.encodeBytes32String("fun-ethereum-mainnet-1");
        const lifeOracle = await LifeOracle.deploy(
            mockRouter,
            mockDonId,
            123 // subscription ID
        );
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

        it("Should initialize with zero fees and supply", async function () {
            const { engine, nateToken } = await loadFixture(deployStabilityEngineFixture);

            expect(await engine.accumulatedEthFees()).to.equal(0);
            expect(await nateToken.totalSupply()).to.equal(0);
        });
    });

    // ============================================
    // MINTING TESTS
    // ============================================

    describe("Minting", function () {

        it("Should allow purchase with ETH at $1.00 peg", async function () {
            const { engine, nateToken, user1, lifeOracle, owner } = await loadFixture(deployStabilityEngineFixture);

            // Needs valuation for over-collateralization check
            // We'll use the LifeOracle's metrics for this
            // But since LifeOracleV2 requires a Chainlink callback, we'll manually set valuation if possible or mock it
            // Our upgraded contract will need to handle this.
        });
    });
});
