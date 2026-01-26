const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer, owner2, owner3] = await ethers.getSigners();
    console.log("Deploying MultiSig with Account:", deployer.address);
    console.log("Additional Signers (Simulated):", owner2.address, owner3.address);

    // Load setup addresses (requires previous deployment)
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error("No deployments found. Run deploy_system.js first.");
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const governanceBoardAddress = deployments.GovernanceBoard;

    if (!governanceBoardAddress) {
        throw new Error("GovernanceBoard not found in deployments.");
    }

    console.log("Existing GovernanceBoard:", governanceBoardAddress);

    // 1. Deploy MultiSigGovernance
    // Config: 2-of-3 (Deployer + 2 Hardhat Accounts)
    // In production, these should be real addresses provided by ENV or arguments
    const owners = [deployer.address, owner2.address, owner3.address];
    const required = 2;

    const MultiSigGovernance = await ethers.getContractFactory("MultiSigGovernance");
    const multiSig = await MultiSigGovernance.deploy(owners, required);
    await multiSig.waitForDeployment();

    console.log("MultiSigGovernance deployed to:", await multiSig.getAddress());

    // 2. Transfer Ownership of GovernanceBoard to MultiSig
    // We need to attach to the existing GovernanceBoard
    const GovernanceBoard = await ethers.getContractFactory("GovernanceBoard");
    const governanceBoard = GovernanceBoard.attach(governanceBoardAddress);

    // Check current owner
    const currentOwner = await governanceBoard.owner();
    if (currentOwner !== deployer.address) {
        console.warn("Deployer is NOT the owner of GovernanceBoard. Cannot transfer ownership.");
        console.warn("Current Owner:", currentOwner);
        console.warn("Please run this script with the current owner account.");
    } else {
        console.log("Transferring GovernanceBoard ownership to MultiSig...");
        const tx = await governanceBoard.transferOwnership(await multiSig.getAddress());
        await tx.wait();
        console.log("Ownership transferred successfully!");
    }

    // Update deployments.json
    deployments.MultiSigGovernance = await multiSig.getAddress();
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("Deployments updated.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
