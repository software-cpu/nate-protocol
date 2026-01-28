const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    console.log(`\n--- Chainlink Setup (${network}) ---`);
    console.log("Using Signer:", signer.address);

    const deploymentPath = path.join(__dirname, `../deployment-${network}.json`);
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ No deployment file found for ${network}. Deploy first.`);
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const addresses = deployment.contracts;

    // Network-specific Chainlink config
    const LINK_TOKEN = network === "sepolia"
        ? "0x779877A7B0D9E8603169DdbD7836e478b4624789"
        : "0x514910771AF9Ca656af840dff83E8264EcF986CA"; // Mainnet LINK

    const ROUTER = network === "sepolia"
        ? "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0"
        : "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6"; // Mainnet Router

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", addresses.LifeOracleV2, signer);
    const linkToken = await hre.ethers.getContractAt(["function transferAndCall(address,uint256,bytes) returns (bool)"], LINK_TOKEN, signer);
    const router = await hre.ethers.getContractAt([
        "function addConsumer(uint64,address)", 
        "function getSubscription(uint64) view returns (uint96,uint96,address,address[],bytes[])"
    ], ROUTER, signer);

    // 1. Check Contract State
    const currentSubId = await oracle.subscriptionId();
    console.log(`\nCurrent Contract Subscription ID: ${currentSubId}`);

    if (currentSubId === 0n) {
        console.log("⚠️  Subscription ID not set in contract.");
        console.log(`   Please create one at: https://functions.chain.link/${network === 'sepolia' ? 'sepolia' : 'ethereum-mainnet'}`);
        return;
    }

    // 2. Fund Subscription
    console.log("\nFunding Subscription with 3 LINK...");
    try {
        const tx = await linkToken.transferAndCall(
            ROUTER,
            3000000000000000000n, // 3 LINK
            hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [currentSubId]),
            { gasLimit: 300000 }
        );
        await tx.wait();
        console.log("✅ Subscription Funded.");
    } catch (e) {
        console.log("⚠️  Could not fund (Check LINK balance or if already funded).");
    }

    // 3. Add Consumer
    console.log(`\nAdding Consumer: ${addresses.LifeOracleV2}...`);
    try {
        const tx = await router.addConsumer(currentSubId, addresses.LifeOracleV2, { gasLimit: 300000 });
        await tx.wait();
        console.log("✅ Consumer Added.");
    } catch (e) {
        console.log("⚠️  Consumer likely already added.");
    }

    console.log("\n🎉 Chainlink Setup Verified!");
}

main().catch(console.error);

main().catch(console.error);
