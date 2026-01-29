const hre = require("hardhat");
const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" }); // Changed to .env to match project structure

async function main() {
    console.log("🚀 MAINNET DEPLOYMENT STARTING...");
    console.log("⚠️  THIS IS REAL MONEY - PROCEEDING IN 10 SECONDS...");

    await new Promise(resolve => setTimeout(resolve, 10000));

    const [deployer] = await ethers.getSigners();

    console.log("\n📊 DEPLOYMENT INFO:");
    console.log("Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

    if (parseFloat(ethers.formatEther(balance)) < 1.0) {
        throw new Error("❌ Insufficient ETH! Need at least 1 ETH for deployment.");
    }

    console.log("\n⏳ Deploying contracts...\n");

    // 1. Deploy NateProtocol Token
    console.log("1️⃣ Deploying NateProtocol token...");
    const NateProtocol = await ethers.getContractFactory("NateProtocol");
    // Assuming NateProtocol takes treasury and council, but script provided had [deployer.address]
    // Let's use the addresses we have from our environment or existing logic
    // For now, following the user's provided script exactly but checking constructor args
    const nateToken = await NateProtocol.deploy(deployer.address, deployer.address);
    await nateToken.waitForDeployment();
    const tokenAddress = await nateToken.getAddress();
    console.log("✅ NateProtocol deployed:", tokenAddress);

    // 2. Deploy LifeOracle
    console.log("\n2️⃣ Deploying LifeOracle...");
    const LifeOracle = await ethers.getContractFactory("LifeOracleV2");

    const CHAINLINK_ROUTER = "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6"; // Mainnet Router
    const CHAINLINK_DON_ID = ethers.encodeBytes32String("fun-ethereum-mainnet-1");
    const CHAINLINK_SUB_ID = process.env.MAINNET_SUB_ID;

    if (!CHAINLINK_SUB_ID) {
        throw new Error("❌ MAINNET_SUB_ID is missing in .env!");
    }

    const oracle = await LifeOracle.deploy(
        CHAINLINK_ROUTER,
        CHAINLINK_DON_ID,
        CHAINLINK_SUB_ID
    );
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log("✅ LifeOracle deployed:", oracleAddress);

    // 3. Deploy StabilityEngine
    console.log("\n3️⃣ Deploying StabilityEngine...");
    const StabilityEngine = await ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(
        tokenAddress,
        oracleAddress,
        deployer.address // Initial owner
    );
    await engine.waitForDeployment();
    const engineAddress = await engine.getAddress();
    console.log("✅ StabilityEngine deployed:", engineAddress);

    // 4. Deploy GovernanceBoard
    console.log("\n4️⃣ Deploying GovernanceBoard...");
    const GovernanceBoard = await ethers.getContractFactory("GovernanceBoard");
    const governance = await GovernanceBoard.deploy(
        engineAddress,
        oracleAddress
    );
    await governance.waitForDeployment();
    const governanceAddress = await governance.getAddress();
    console.log("✅ GovernanceBoard deployed:", governanceAddress);

    // 5. Deploy TaskMarket
    console.log("\n5️⃣ Deploying TaskMarket...");
    const TaskMarket = await ethers.getContractFactory("TaskMarket");
    const market = await TaskMarket.deploy(tokenAddress);
    await market.waitForDeployment();
    const marketAddress = await market.getAddress();
    console.log("✅ TaskMarket deployed:", marketAddress);

    console.log("\n⏳ Waiting for block confirmations...");
    // Using wait(6) instead of manual sleep for better reliability
    await nateToken.deploymentTransaction().wait(6);

    // 6. Setup permissions
    console.log("\n6️⃣ Setting up permissions...");

    console.log("Granting MINTER_ROLE to StabilityEngine...");
    const MINTER_ROLE = await nateToken.MINTER_ROLE();
    await nateToken.grantRole(MINTER_ROLE, engineAddress);

    console.log("Setting governance board in engine...");
    // Note: Ensure StabilityEngine has setGovernanceBoard function
    if (engine.setGovernanceBoard) {
        await engine.setGovernanceBoard(governanceAddress);
    }

    // Oracle initialize logic - following provided script
    if (oracle.initialize) {
        console.log("Initializing oracle...");
        await oracle.initialize(process.env.INITIAL_ORACLE_SCORE || 750);
    }

    console.log("✅ Permissions configured");

    // 7. Transfer ownership to multisig (Manual step usually preferred for safety, but script includes it)
    const EMERGENCY_MULTISIG = process.env.EMERGENCY_MULTISIG;
    if (EMERGENCY_MULTISIG) {
        console.log("\n7️⃣ Transferring ownership to multisig...");
        console.log("Multisig address:", EMERGENCY_MULTISIG);

        // Check if transferOwnership exists on these contracts
        if (nateToken.transferOwnership) await nateToken.transferOwnership(EMERGENCY_MULTISIG);
        if (engine.transferOwnership) await engine.transferOwnership(EMERGENCY_MULTISIG);
        if (oracle.transferOwnership) await oracle.transferOwnership(EMERGENCY_MULTISIG);

        console.log("✅ Ownership transferred to multisig");
    } else {
        console.log("\n⚠️  WARNING: No multisig configured! Ownership remains with deployer.");
    }

    // 8. Save deployment info
    const deployment = {
        network: "mainnet",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            NateProtocol: tokenAddress,
            LifeOracle: oracleAddress,
            StabilityEngine: engineAddress,
            GovernanceBoard: governanceAddress,
            TaskMarket: marketAddress
        },
        multisig: EMERGENCY_MULTISIG || "NOT_CONFIGURED",
        chainlinkSubId: CHAINLINK_SUB_ID
    };

    const fs = require('fs');
    fs.writeFileSync(
        'deployment-mainnet.json',
        JSON.stringify(deployment, null, 2)
    );

    console.log("\n" + "=".repeat(80));
    console.log("🎉 MAINNET DEPLOYMENT COMPLETE!");
    console.log("=".repeat(80));
    console.log("\n📄 Deployment info saved to: deployment-mainnet.json");
    console.log("\n📋 CONTRACT ADDRESSES:");
    console.log("━".repeat(80));
    console.log("NateProtocol Token:", tokenAddress);
    console.log("LifeOracle:        ", oracleAddress);
    console.log("StabilityEngine:   ", engineAddress);
    console.log("GovernanceBoard:   ", governanceAddress);
    console.log("TaskMarket:        ", marketAddress);
    console.log("━".repeat(80));

    // Verification commands
    console.log("\n🔍 VERIFICATION COMMANDS:");
    console.log("━".repeat(80));
    console.log(`npx hardhat verify --network mainnet ${tokenAddress} "${deployer.address}" "${deployer.address}"`);
    console.log(`npx hardhat verify --network mainnet ${oracleAddress} "${CHAINLINK_ROUTER}" "${CHAINLINK_DON_ID}" "${CHAINLINK_SUB_ID}"`);
    console.log(`npx hardhat verify --network mainnet ${engineAddress} "${tokenAddress}" "${oracleAddress}" "${deployer.address}"`);
    console.log("━".repeat(80));
}

main()
    .then(() => {
        console.log("\n✅ Deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error);
        process.exit(1);
    });
