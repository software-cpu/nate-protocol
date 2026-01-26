const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🧬 STARTING PHASE 2 DEMO (Quantified Self) 🧬");
    console.log("==============================================\n");

    const [nate] = await hre.ethers.getSigners();
    console.log(`👤 Deployer (Nate): ${nate.address}\n`);

    // ==========================================================
    // 1. DEPLOYMENT (Chainlink Intergated)
    // ==========================================================
    console.log("--- 1. DEPLOYING V2 INFRASTRUCTURE ---");

    // Mock Chainlink Router for Local Demo (Just a placeholder address if not needed for deploy)
    // In reality, on Sepolia, this is 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0
    const MOCK_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
    const MOCK_DON_ID = hre.ethers.encodeBytes32String("fun-ethereum-sep-1");
    const SUB_ID = 1234;

    // Deploy LifeOracleV2
    const LifeOracleV2 = await hre.ethers.getContractFactory("LifeOracleV2");
    console.log("   -> Deploying LifeOracleV2...");
    const oracle = await LifeOracleV2.deploy(MOCK_ROUTER, MOCK_DON_ID, SUB_ID);
    await oracle.waitForDeployment();
    console.log(`✅ LifeOracleV2 deployed: ${await oracle.getAddress()}`);

    // Deploy NateProtocol
    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    const token = await NateProtocol.deploy(nate.address);
    await token.waitForDeployment();
    console.log(`✅ NateProtocol deployed: ${await token.getAddress()}`);

    // Deploy StabilityEngine
    const StabilityEngine = await hre.ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(await token.getAddress(), await oracle.getAddress());
    await engine.waitForDeployment();
    console.log(`✅ StabilityEngine deployed: ${await engine.getAddress()}`);

    // ==========================================================
    // 2. CONFIGURATION
    // ==========================================================
    console.log("\n--- 2. CONFIGURING SYSTEMS ---");

    // 1. Set Source Code in Oracle
    const sourcePath = path.join(__dirname, "source", "calculate_score.js");
    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    console.log("   -> Uploading JS Source calculation logic to Oracle...");
    await oracle.setSourceCode(sourceCode);
    console.log("✅ Source code set.");

    // 2. Wire Permissions
    console.log("   -> Granting MINTER_ROLE to Engine...");
    await token.setStabilityEngine(await engine.getAddress());
    console.log("✅ Configured.");

    // ==========================================================
    // 3. VERIFICATION (Static)
    // ==========================================================
    console.log("\n--- 3. SYSTEM CHECK ---");

    // Check initial values
    const currentMetrics = await oracle.metrics();
    console.log("   -> Initial Metrics (Should be empty):");
    console.log(`      Sleep Score: ${currentMetrics.sleepScore}`);
    console.log(`      Total Value: ${currentMetrics.totalValue}`);

    console.log("\n⚠️  NOTE: To fully execute 'updateMetrics', you must run this on Sepolia with a valid Chainlink Subscription.");
    console.log("   Local execution of Chainlink Functions requires the 'functions-toolkit' simulation (see verify_score_simple.js).");

    console.log("\n✅ PHASE 2 DEPLOYMENT & CONFIG DEMO COMPLETE");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
