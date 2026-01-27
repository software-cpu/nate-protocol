const hre = require("hardhat");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    console.log("=== ORACLE FULL STATE ===\n");

    const owner = await oracle.owner();
    console.log("Owner:", owner);
    console.log("Is Owner:", owner.toLowerCase() === signer.address.toLowerCase());

    const subId = await oracle.subscriptionId();
    console.log("Subscription ID:", subId.toString());

    const source = await oracle.sourceCode();
    console.log("Source Code Length:", source.length, "chars");
    if (source.length > 0) {
        console.log("Source Preview:", source.substring(0, 80) + "...");
    }

    const reqId = await oracle.s_lastRequestId();
    console.log("Last Request ID:", reqId);

    console.log("\n=== METRICS ===");
    const metrics = await oracle.metrics();
    console.log("Total Value:", hre.ethers.formatEther(metrics.totalValue), "ETH");
    console.log("Sleep Score:", metrics.sleepScore.toString());
    console.log("Resting HR:", metrics.restingHeartRate.toString());
    console.log("Deep Work:", metrics.deepWorkHours.toString(), "hrs");
    console.log("Commit Streak:", metrics.gitHubCommitStreak.toString(), "days");
    console.log("Social Score:", metrics.socialImpactScore.toString());
    console.log("Future Earnings:", hre.ethers.formatEther(metrics.futureEarnings), "ETH");
    console.log("Last Update:", Number(metrics.lastUpdate) === 0 ? "Never" : new Date(Number(metrics.lastUpdate) * 1000).toISOString());
}

main().catch(console.error);
