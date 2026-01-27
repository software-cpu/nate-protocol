const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // Read minified source
    const sourcePath = path.join(__dirname, "source", "calculate_score_min.js");
    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    console.log("Source length:", sourceCode.length, "chars");

    // Set source code
    console.log("\n1. Setting minified source code...");
    try {
        const tx1 = await oracle.setSourceCode(sourceCode, { gasLimit: 500000 });
        console.log("Tx:", tx1.hash);
        await tx1.wait();
        console.log("✅ Source code set!");
    } catch (e) {
        console.error("❌ setSourceCode failed:", e.reason || e.message);
        return;
    }

    // Verify
    const stored = await oracle.sourceCode();
    console.log("Stored length:", stored.length);

    // Trigger updateMetrics
    console.log("\n2. Triggering updateMetrics()...");
    try {
        const tx2 = await oracle.updateMetrics([], { gasLimit: 500000 });
        console.log("Tx:", tx2.hash);
        await tx2.wait();
        console.log("✅ updateMetrics() sent to Chainlink DON!");
        console.log("   Wait ~30-60 seconds for callback...");
    } catch (e) {
        console.error("❌ updateMetrics failed:", e.reason || e.message);
    }

    // Show request ID
    try {
        const reqId = await oracle.s_lastRequestId();
        console.log("\nLast Request ID:", reqId);
    } catch (e) {
        console.log("Could not read request ID");
    }
}

main().catch(console.error);
