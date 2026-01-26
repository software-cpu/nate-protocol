const { ethers } = require("hardhat");

async function main() {
    const [owner, user1] = await ethers.getSigners();
    console.log("Owner:", owner.address);

    // 1. Deploy NateProtocol
    const NateProtocol = await ethers.getContractFactory("NateProtocol");
    const nateToken = await NateProtocol.deploy(owner.address);
    await nateToken.waitForDeployment();
    console.log("NateToken:", await nateToken.getAddress());

    // 2. Deploy MockOracle
    const MockLifeOracle = await ethers.getContractFactory("MockLifeOracle");
    const mockOracle = await MockLifeOracle.deploy();
    await mockOracle.waitForDeployment();
    await mockOracle.setTotalValue(ethers.parseEther("10000000"));
    console.log("MockOracle:", await mockOracle.getAddress());

    // 3. Deploy StabilityEngine
    const StabilityEngine = await ethers.getContractFactory("StabilityEngine");
    const stabilityEngine = await StabilityEngine.deploy(await nateToken.getAddress(), await mockOracle.getAddress());
    await stabilityEngine.waitForDeployment();
    console.log("StabilityEngine:", await stabilityEngine.getAddress());

    // Grant MINTER
    const MINTER_ROLE = await nateToken.MINTER_ROLE();
    await nateToken.grantRole(MINTER_ROLE, await stabilityEngine.getAddress());

    // 4. Deploy TaskMarket
    const TaskMarket = await ethers.getContractFactory("TaskMarket");
    const taskMarket = await TaskMarket.deploy(await nateToken.getAddress(), await mockOracle.getAddress());
    await taskMarket.waitForDeployment();
    console.log("TaskMarket:", await taskMarket.getAddress());

    // 5. Deploy GovernanceBoard
    const GovernanceBoard = await ethers.getContractFactory("GovernanceBoard");
    const governanceBoard = await GovernanceBoard.deploy(
        await stabilityEngine.getAddress(),
        await taskMarket.getAddress()
    );
    await governanceBoard.waitForDeployment();
    console.log("GovernanceBoard:", await governanceBoard.getAddress());

    // Transfer Ownership
    await stabilityEngine.transferOwnership(await governanceBoard.getAddress());

    // 6. Setup Task & Bets
    await taskMarket.createTask("Test Task", 3600);
    const taskId = 1; // 1-based index
    console.log("Task Created. ID:", taskId);

    // Mint tokens to user1
    await nateToken.grantRole(MINTER_ROLE, owner.address); // temp minting
    await nateToken.mint(user1.address, ethers.parseEther("100"));

    // Bet
    await nateToken.connect(user1).approve(await taskMarket.getAddress(), ethers.parseEther("100"));
    await taskMarket.connect(user1).placeBet(taskId, true, ethers.parseEther("50"));
    console.log("User1 Bet YES 50");

    // Check Odds
    const odds = await taskMarket.getOdds(taskId);
    console.log("Odds:", odds.toString()); // [100, 0]

    // 7. Request Mint
    const mintAmount = ethers.parseEther("1000");
    await governanceBoard.requestMint(mintAmount, taskId);
    console.log("Mint Requested");

    // 8. Approve Mint (Manual call to trigger PID)
    console.log("Approving Mint...");
    try {
        const tx = await governanceBoard.approveMint(0);
        await tx.wait();
        console.log("Mint Approved Successfully!");
    } catch (error) {
        console.error("Approve Mint Failed:", error.message);
        if (error.data) {
            console.error("Revert Data:", error.data);
        }
    }

    // Check resulting supply
    console.log("Final Supply:", (await nateToken.totalSupply()).toString());

    // Check Request status
    const req = await governanceBoard.requests(0);
    console.log("Request Executed:", req.executed);
    console.log("Request Vetoed:", req.vetoed);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
