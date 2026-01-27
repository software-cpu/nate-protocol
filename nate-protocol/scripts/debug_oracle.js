const hre = require("hardhat");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer Address:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    const owner = await oracle.owner();
    console.log("Oracle Owner:", owner);

    console.log("Match:", owner.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");

    // Check current source code
    const currentSource = await oracle.sourceCode();
    console.log("Current Source Code Length:", currentSource.length, "chars");

    // Check subscription ID
    const subId = await oracle.subscriptionId();
    console.log("Subscription ID:", subId.toString());
}

main().catch(console.error);
