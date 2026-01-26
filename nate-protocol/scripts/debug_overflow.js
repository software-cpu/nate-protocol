const { ethers } = require("hardhat");

async function main() {
    console.log("Starting Debug Overflow Script...");
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("Owner:", owner.address);

    // 1. Deploy Core
    const NateProtocol = await ethers.getContractFactory("NateProtocol");
    const nateToken = await NateProtocol.deploy(owner.address);
    await nateToken.waitForDeployment();
    console.log("NateToken deployed");

    const MockLifeOracle = await ethers.getContractFactory("MockLifeOracle");
    const mockOracle = await MockLifeOracle.deploy();
    await mockOracle.waitForDeployment();
    await mockOracle.setTotalValue(ethers.parseEther("10000000"));
    console.log("MockOracle deployed");

    const StabilityEngine = await ethers.getContractFactory("StabilityEngine");
    const stabilityEngine = await StabilityEngine.deploy(await nateToken.getAddress(), await mockOracle.getAddress());
    await stabilityEngine.waitForDeployment();
    console.log("StabilityEngine deployed");

    // Grant MINTER to Engine
    const MINTER_ROLE = await nateToken.MINTER_ROLE();
    await nateToken.grantRole(MINTER_ROLE, await stabilityEngine.getAddress());

    const TaskMarket = await ethers.getContractFactory("TaskMarket");
    const taskMarket = await TaskMarket.deploy(await nateToken.getAddress(), await mockOracle.getAddress());
    await taskMarket.waitForDeployment();
    console.log("TaskMarket deployed");

    const GovernanceBoard = await ethers.getContractFactory("GovernanceBoard");
    const governanceBoard = await GovernanceBoard.deploy(await stabilityEngine.getAddress(), await taskMarket.getAddress());
    await governanceBoard.waitForDeployment();
    console.log("GovernanceBoard deployed");

    // Integration
    await stabilityEngine.transferOwnership(await governanceBoard.getAddress());
    console.log("Ownership transferred");

    // 2. Setup Low Confidence Scenario
    // Create Task
    await taskMarket.createTask("Low Confidence", 0, 3600);
    const taskId = 1;
    console.log("Task Created:", taskId);

    // Mint tokens for betting
    await nateToken.grantRole(MINTER_ROLE, owner.address); // Temp
    await nateToken.mint(user1.address, ethers.parseEther("100"));
    await nateToken.mint(user2.address, ethers.parseEther("100"));
    console.log("Tokens minted to users");

    // Approve
    await nateToken.connect(user1).approve(await taskMarket.getAddress(), ethers.parseEther("100"));
    await nateToken.connect(user2).approve(await taskMarket.getAddress(), ethers.parseEther("100"));
    console.log("Approvals done");

    // Bet
    console.log("User1 Betting YES 10...");
    await taskMarket.connect(user1).placeBet(taskId, true, ethers.parseEther("10"));
    console.log("User1 Bet Placed");

    console.log("User2 Betting NO 90...");
    await taskMarket.connect(user2).placeBet(taskId, false, ethers.parseEther("90"));
    console.log("User2 Bet Placed");

    const odds = await taskMarket.getOdds(taskId);
    console.log("Odds (Yes, No):", odds[0].toString(), odds[1].toString());

    // 3. Request Mint
    const mintAmount = ethers.parseEther("1000");
    await governanceBoard.requestMint(mintAmount, taskId);
    console.log("Mint Requested");

    // 4. Approve Mint (This hits the PID logic with overflow protection)
    console.log("Approving Mint...");
    try {
        const tx = await governanceBoard.approveMint(0);
        await tx.wait();
        console.log("Mint Approved! Overflow protection worked (clamped or handled).");

        // Check logs?
        const req = await governanceBoard.requests(0);
        console.log("Request Executed:", req.executed);

        // Maybe check events to see clamped values?
        // Hard to see internal variables, but if it didn't revert, we are good.
    } catch (e) {
        console.error("Mint Approval Failed:", e.message);
        if (e.data) console.error("Data:", e.data);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
