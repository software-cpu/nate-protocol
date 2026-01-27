const { ethers } = require("hardhat");

async function main() {
    const tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const [deployer] = await ethers.getSigners();

    const token = await ethers.getContractAt("NateProtocol", tokenAddress);

    const MINTER_ROLE = await token.MINTER_ROLE();
    if (!(await token.hasRole(MINTER_ROLE, deployer.address))) {
        console.log("Granting MINTER_ROLE...");
        const tx = await token.grantRole(MINTER_ROLE, deployer.address);
        await tx.wait();
    }

    console.log("Minting 10,000 NATE...");
    const txMint = await token.mint(deployer.address, ethers.parseEther("10000"));
    await txMint.wait();

    console.log("Success! Minted 10,000 NATE to", deployer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
