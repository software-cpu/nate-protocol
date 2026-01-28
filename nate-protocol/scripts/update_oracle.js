const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    console.log(`\n--- Oracle Update (${network}) ---`);
    console.log("Using Signer:", signer.address);

    const deploymentPath = path.join(__dirname, `../deployment-${network}.json`);
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ No deployment file found for ${network}. Deploy first.`);
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const addresses = deployment.contracts;

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", addresses.LifeOracleV2, signer);

    // 1. Read Source Code
    const sourceFile = "calculate_score_min.js";
    const sourcePath = path.join(__dirname, "source", sourceFile);

    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ Source file not found: ${sourcePath}`);
        return;
    }

    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    console.log(`\nSource File: ${sourceFile}`);
    console.log(`Length: ${sourceCode.length} chars`);

    // 2. Set Source Code
    console.log("\nSetting Source Code on Contract...");
    try {
        const tx = await oracle.setSourceCode(sourceCode, { gasLimit: 500000 });
        await tx.wait();
        console.log("✅ Source Code updated.");
    } catch (e) {
        console.error("❌ Failed to set source code (Check ownership or gas).");
        console.error(e.reason || e.message);
        return;
    }

    // 3. Trigger Update
    console.log("\nTriggering updateMetrics()...");
    try {
        const tx = await oracle.updateMetrics([], { gasLimit: 500000 });
        await tx.wait();
        console.log("✅ updateMetrics() sent to Chainlink DON!");
    } catch (e) {
        console.error("❌ updateMetrics() failed.");
        console.error(e.reason || e.message);
    }

    // 4. View Current Metrics
    console.log("\n=== CURRENT METRICS ===");
    const metrics = await oracle.metrics();
    console.log(`Total Value: ${hre.ethers.formatEther(metrics.totalValue)} ETH`);
}

main().catch(console.error);

main().catch(console.error);
