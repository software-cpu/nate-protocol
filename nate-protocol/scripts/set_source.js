const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // Read the source file
    const sourcePath = path.join(__dirname, "source", "calculate_score.js");
    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    console.log("Source code length:", sourceCode.length, "chars");

    // Set with higher gas
    console.log("\nSetting source code...");
    try {
        const tx = await oracle.setSourceCode(sourceCode, { gasLimit: 1000000 });
        console.log("Tx hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Success! Gas used:", receipt.gasUsed.toString());
    } catch (error) {
        console.error("❌ Failed:");
        console.error("Reason:", error.reason || "unknown");
        console.error("Message:", error.message);
    }

    // Verify
    const newSource = await oracle.sourceCode();
    console.log("\nNew source length:", newSource.length);
}

main().catch(console.error);
