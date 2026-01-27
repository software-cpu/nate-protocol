const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // 1. Read Source Code
    // Try calculate_score_min.js first as it's more likely to fit constraints
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
        console.log("   Check Etherscan or local logs for 'Fulfill' event in ~30s.");
    } catch (e) {
        if (e.message.includes("revert")) {
            console.error("⚠️  updateMetrics() reverted.");
            console.error("   Possible causes:");
            console.error("   - Subscription not funded (Check Chainlink Dashboard)");
            console.error("   - Consumer not authorized (Check Chainlink Dashboard)");
            console.error("   - Source code invalid format");
        } else {
            console.error(e);
        }
    }

    // 4. View Current Metrics
    console.log("\n=== CURRENT METRICS ===");
    const metrics = await oracle.metrics();
    console.log(`Total Value: ${hre.ethers.formatEther(metrics.totalValue)} ETH`);
    console.log(`Last Update: ${metrics.lastUpdate > 0 ? new Date(Number(metrics.lastUpdate) * 1000).toISOString() : "Never"}`);
}

main().catch(console.error);
