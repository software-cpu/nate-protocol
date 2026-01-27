const hre = require("hardhat");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // Check state
    console.log("\n=== ORACLE STATE ===");
    const source = await oracle.sourceCode();
    console.log("Source Code:", source.substring(0, 100) + (source.length > 100 ? "..." : ""));
    console.log("Source Length:", source.length);

    const subId = await oracle.subscriptionId();
    console.log("Subscription ID:", subId.toString());

    const donId = await oracle.donID();
    console.log("DON ID:", donId);

    const gasLimit = await oracle.gasLimit();
    console.log("Gas Limit:", gasLimit.toString());

    // Try updateMetrics
    console.log("\n=== CALLING updateMetrics ===");
    try {
        const tx = await oracle.updateMetrics([], { gasLimit: 500000 });
        console.log("Tx:", tx.hash);
        await tx.wait();
        console.log("✅ updateMetrics sent!");

        const reqId = await oracle.s_lastRequestId();
        console.log("Request ID:", reqId);
    } catch (e) {
        console.error("❌ Failed:", e.reason || e.message);
    }

    // Show metrics
    console.log("\n=== CURRENT METRICS ===");
    const metrics = await oracle.metrics();
    console.log("Total Value:", hre.ethers.formatEther(metrics.totalValue), "ETH");
    console.log("Sleep Score:", metrics.sleepScore.toString());
    console.log("Last Update:", Number(metrics.lastUpdate) === 0 ? "Never" : new Date(Number(metrics.lastUpdate) * 1000).toISOString());
}

main().catch(console.error);
