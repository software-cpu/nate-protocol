const { ethers } = require("hardhat");

async function main() {
    const marketAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    const [deployer] = await ethers.getSigners();

    const market = await ethers.getContractAt("TaskMarket", marketAddress);

    console.log("Creating Alpha Test Market...");
    // string calldata _description, TimeHorizon _horizon, uint256 _durationSeconds
    const tx = await market.createTask("Alpha Test: Complete UI Testing", 1, 86400); // Daily, 24h
    await tx.wait();

    console.log("Success! Created market #1");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
