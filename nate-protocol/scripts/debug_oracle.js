const hre = require("hardhat");

const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);

    const owner = await oracle.owner();
    const subId = await oracle.subscriptionId();
    const currentSource = await oracle.sourceCode();

    console.log("=== ORACLE DEBUG ===");
    console.log("Signer:", signer.address);
    console.log("Owner:", owner);
    console.log("Is Owner:", owner.toLowerCase() === signer.address.toLowerCase());
    console.log("Sub ID:", subId.toString());
    console.log("Source Length:", currentSource.length);
}

main().catch(console.error);
