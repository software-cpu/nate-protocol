const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // 1. Set Source Code
    console.log("\n📄 Setting JavaScript Source Code on Oracle...");
    const sourcePath = path.join(__dirname, "source", "calculate_score.js");
    const sourceCode = fs.readFileSync(sourcePath, "utf8");

    const setTx = await oracle.setSourceCode(sourceCode, { gasLimit: 500000 });
    await setTx.wait();
    console.log("✅ Source Code uploaded to Oracle.");

    // 2. Trigger Update (call updateMetrics)
    console.log("\n🔄 Triggering updateMetrics() to fetch data from Chainlink DON...");
    try {
        const updateTx = await oracle.updateMetrics([], { gasLimit: 500000 });
        await updateTx.wait();
        console.log("✅ updateMetrics() called successfully!");
        console.log("   The Chainlink DON will now execute the JavaScript code.");
        console.log("   Check the contract state in ~30-60 seconds for updated metrics.");
    } catch (error) {
        if (error.message.includes("revert")) {
            console.log("⚠️  updateMetrics() reverted.");
            console.log("   This might happen if the Chainlink subscription isn't properly funded or configured.");
            console.log("   Error:", error.reason || error.message);
        } else {
            throw error;
        }
    }

    // 3. Check current metrics
    console.log("\n📊 Current Oracle Metrics:");
    const metrics = await oracle.metrics();
    console.log(`   Total Value: ${hre.ethers.formatEther(metrics.totalValue)} ETH`);
    console.log(`   Sleep Score: ${metrics.sleepScore}`);
    console.log(`   Resting HR: ${metrics.restingHeartRate}`);
    console.log(`   Deep Work: ${metrics.deepWorkHours} hrs`);
    console.log(`   Commit Streak: ${metrics.gitHubCommitStreak} days`);
    console.log(`   Last Update: ${new Date(Number(metrics.lastUpdate) * 1000).toISOString()}`);

    console.log("\n🎉 Oracle Setup Complete!");
}

main().catch(console.error);
