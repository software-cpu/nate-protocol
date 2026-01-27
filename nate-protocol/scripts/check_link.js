const hre = require("hardhat");

const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    const linkToken = await hre.ethers.getContractAt(
        ["function balanceOf(address) view returns (uint256)"],
        SEPOLIA_LINK_TOKEN
    );

    try {
        const balance = await linkToken.balanceOf(signer.address);
        console.log(`LINK Balance: ${hre.ethers.formatEther(balance)} LINK`);
    } catch (e) {
        console.error("Error fetching LINK balance:", e.message);
    }
}

main().catch(console.error);
