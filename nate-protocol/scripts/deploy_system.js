const hre = require("hardhat");

/**
 * 🚀 MAINNET DEPLOYMENT SCRIPT
 * Deploys the full Nate Protocol system in the correct sequence.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy_system.js --network sepolia
 *   npx hardhat run scripts/deploy_system.js --network mainnet
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🚀 NATE PROTOCOL MAINNET DEPLOYMENT                 ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    console.log(`Network: ${hre.network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

    // ========== STEP 1: Deploy LifeOracleV2 (Data Source) ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 1: Deploying LifeOracleV2 (Oracle)");
    console.log("─────────────────────────────────────────────────────────────────");

    // Chainlink Functions config (replace with actual values for network)
    const CHAINLINK_ROUTER = hre.network.name === "sepolia"
        ? "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0"  // Sepolia Router
        : "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6"; // Ethereum Mainnet

    const CHAINLINK_DON_ID = hre.network.name === "sepolia"
        ? hre.ethers.encodeBytes32String("fun-ethereum-sepolia-1")
        : hre.ethers.encodeBytes32String("fun-ethereum-mainnet-1");
    const CHAINLINK_SUB_ID = 0; // You need to create this on functions.chain.link

    const LifeOracleV2 = await hre.ethers.getContractFactory("LifeOracleV2");
    const oracle = await LifeOracleV2.deploy(CHAINLINK_ROUTER, CHAINLINK_DON_ID, CHAINLINK_SUB_ID);
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();

    console.log(`   ✓ LifeOracleV2: ${oracleAddress}\n`);

    // ========== STEP 2: Deploy NateProtocol (Token) ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 2: Deploying NateProtocol (Token)");
    console.log("─────────────────────────────────────────────────────────────────");

    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    const token = await NateProtocol.deploy(deployer.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    console.log(`   ✓ NateProtocol: ${tokenAddress}\n`);

    // ========== STEP 3: Deploy StabilityEngine (Central Bank) ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 3: Deploying StabilityEngine (Central Bank)");
    console.log("─────────────────────────────────────────────────────────────────");

    const StabilityEngine = await hre.ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(tokenAddress, oracleAddress);
    await engine.waitForDeployment();
    const engineAddress = await engine.getAddress();

    console.log(`   ✓ StabilityEngine: ${engineAddress}\n`);

    // ========== STEP 4: Configure Token <-> Engine ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 4: Configuring Token <-> Engine");
    console.log("─────────────────────────────────────────────────────────────────");

    await token.setStabilityEngine(engineAddress);
    console.log(`   ✓ Token.setStabilityEngine(${engineAddress})`);
    console.log(`   ✓ StabilityEngine granted MINTER_ROLE\n`);

    // ========== STEP 5: Deploy TaskMarket (Prediction Market) ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 5: Deploying TaskMarket (Prediction Market)");
    console.log("─────────────────────────────────────────────────────────────────");

    const TaskMarket = await hre.ethers.getContractFactory("TaskMarket");
    const market = await TaskMarket.deploy(tokenAddress, oracleAddress);
    await market.waitForDeployment();
    const marketAddress = await market.getAddress();

    console.log(`   ✓ TaskMarket: ${marketAddress}\n`);

    // ========== STEP 6: Deploy GovernanceBoard (AI + Market Signals) ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 6: Deploying GovernanceBoard (AI + Sigmoid Market Signals)");
    console.log("─────────────────────────────────────────────────────────────────");

    const GovernanceBoard = await hre.ethers.getContractFactory("GovernanceBoard");
    const board = await GovernanceBoard.deploy(engineAddress, marketAddress);
    await board.waitForDeployment();
    const boardAddress = await board.getAddress();

    console.log(`   ✓ GovernanceBoard: ${boardAddress}`);
    console.log(`   ✓ Board reads market signals via sigmoid function\n`);

    // ========== STEP 7: Transfer Engine Ownership to Board ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 7: Transferring Engine Ownership to Board");
    console.log("─────────────────────────────────────────────────────────────────");

    await engine.transferOwnership(boardAddress);
    console.log(`   ✓ StabilityEngine.owner = GovernanceBoard`);
    console.log(`   ✓ All future mints require AI + Market approval\n`);

    // ========== DEPLOYMENT COMPLETE ==========
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           ✅ DEPLOYMENT COMPLETE                              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    console.log("📋 CONTRACT ADDRESSES:");
    console.log(`   LifeOracleV2:     ${oracleAddress}`);
    console.log(`   NateProtocol:     ${tokenAddress}`);
    console.log(`   StabilityEngine:  ${engineAddress}`);
    console.log(`   GovernanceBoard:  ${boardAddress}`);
    console.log(`   TaskMarket:       ${marketAddress}\n`);

    console.log("⚠️  NEXT STEPS:");
    console.log("   1. Verify contracts on Etherscan");
    console.log("   2. Create Chainlink Functions Subscription");
    console.log("   3. Add LifeOracle as Consumer");
    console.log("   4. Fund subscription with LINK");
    console.log("   5. Initialize Uniswap V3 pool (run init_uniswap_v3.js)");
    console.log();

    // Save deployment addresses
    const deployment = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            LifeOracleV2: oracleAddress,
            NateProtocol: tokenAddress,
            StabilityEngine: engineAddress,
            StabilityEngine: engineAddress,
            GovernanceBoard: boardAddress,
            TaskMarket: marketAddress
        }
    };

    const fs = require('fs');
    fs.writeFileSync(
        `deployment-${hre.network.name}.json`,
        JSON.stringify(deployment, null, 2)
    );
    console.log(`📝 Deployment info saved to deployment-${hre.network.name}.json\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
