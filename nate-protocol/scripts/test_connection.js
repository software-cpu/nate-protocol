const hre = require("hardhat");

async function main() {
    console.log("Testing connection to Sepolia...");
    try {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        console.log("✅ Connection Successful!");
        console.log("Current Block:", blockNumber);

        const [deployer] = await hre.ethers.getSigners();
        console.log("Deployer Address:", deployer.address);
        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log("Deployer Balance:", hre.ethers.formatEther(balance), "ETH");
    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
}

main();
