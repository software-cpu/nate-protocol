const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    // Try a simple string first
    const simpleSource = "return 42;";
    console.log("Testing with simple source:", simpleSource);

    // Static call first to get revert reason
    try {
        await oracle.setSourceCode.staticCall(simpleSource);
        console.log("✅ Static call succeeded - transaction should work");

        const tx = await oracle.setSourceCode(simpleSource, { gasLimit: 500000 });
        console.log("Tx:", tx.hash);
        await tx.wait();
        console.log("✅ Source code set!");

        const stored = await oracle.sourceCode();
        console.log("Stored source:", stored);
    } catch (error) {
        console.error("❌ Error:");
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        console.error(error.message);
    }
}

main().catch(console.error);
