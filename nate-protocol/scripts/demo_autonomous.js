const hre = require("hardhat");

async function main() {
    console.log("🤖 STARTING PHASE 3: THE AUTONOMOUS SELF 🤖");
    console.log("================================================\n");

    const [nate, aiAgent] = await hre.ethers.getSigners();
    console.log(`👤 Nate (The Talent):      ${nate.address}`);
    console.log(`🤖 AI Board Member:        ${aiAgent.address}\n`);

    // ==========================================================
    // 1. DEPLOYMENT
    // ==========================================================
    console.log("--- 1. DEPLOYING ZK & AI INFRASTRUCTURE ---");

    // 1. Mock Verifier
    const MockVerifier = await hre.ethers.getContractFactory("MockGroth16Verifier");
    const verifier = await MockVerifier.deploy();
    await verifier.waitForDeployment();
    console.log(`✅ ZK-Verifier deployed:   ${await verifier.getAddress()}`);

    // 2. ZK Life Oracle
    const ZkLifeOracle = await hre.ethers.getContractFactory("ZkLifeOracle");
    // Mock Router/DON ID for constructor
    const oracle = await ZkLifeOracle.deploy(
        "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
        hre.ethers.encodeBytes32String("mock-don"),
        1,
        await verifier.getAddress()
    );
    await oracle.waitForDeployment();
    console.log(`✅ ZkLifeOracle deployed:  ${await oracle.getAddress()}`);

    // 3. Nate Protocol
    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    const token = await NateProtocol.deploy(nate.address);
    await token.waitForDeployment();

    // 4. Stability Engine
    const StabilityEngine = await hre.ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(await token.getAddress(), await oracle.getAddress());
    await engine.waitForDeployment();
    console.log(`✅ StabilityEngine deployed: ${await engine.getAddress()}`);

    // 5. Governance Board
    const GovernanceBoard = await hre.ethers.getContractFactory("GovernanceBoard");
    const board = await GovernanceBoard.deploy(await engine.getAddress());
    await board.waitForDeployment();
    console.log(`✅ GovernanceBoard deployed: ${await board.getAddress()}`);


    // ==========================================================
    // 2. WIRING & TRANSFER OF POWER
    // ==========================================================
    console.log("\n--- 2. TRANSFERRING POWER TO AI ---");

    // Token authorizes Engine
    await token.setStabilityEngine(await engine.getAddress());

    // Engine ownership -> Board
    // Important: Engine.mint() is onlyOwner. Board must be owner.
    await engine.transferOwnership(await board.getAddress());
    console.log("   -> StabilityEngine Ownership transferred to Board");

    // Board Ownership -> Shared? Or Nate stays owner of Board, but AI Agent is an authorized signer?
    // In the contract, `approveMint` is `onlyOwner`.
    // For demo, we'll pretend Nate runs the AI script, or we transfer Board ownership to AI Agent.
    // Let's transfer Board ownership to AI Agent for true autonomy.
    await board.transferOwnership(aiAgent.address);
    console.log("   -> GovernanceBoard Ownership transferred to AI Agent");


    // ==========================================================
    // 3. THE WORK (ZK PROOF)
    // ==========================================================
    console.log("\n--- 3. SUBMITTING ZK-WORK PROOF ---");

    // Mock Proof Data (Would come from snarkjs)
    const pA = [0, 0];
    const pB = [[0, 0], [0, 0]];
    const pC = [0, 0];
    // Public Signals: [MinThreshold, ProjectHash]
    const pubSignals = [4, 123456789];

    console.log("   -> Nate submits Proof(DeepWork=6, Project='Secret X')...");

    // Initial Value
    const valBefore = (await oracle.metrics()).totalValue;

    await oracle.submitSecretWorkProof(pA, pB, pC, pubSignals);

    const valAfter = (await oracle.metrics()).totalValue;
    console.log(`   -> ZK Proof Verified! Value increased by $${hre.ethers.formatEther(valAfter - valBefore)}`);


    // ==========================================================
    // 4. THE MINT REQUEST
    // ==========================================================
    console.log("\n--- 4. REQUESTING MINT (AI INTERVENTION) ---");

    // Nate (now just a user to the board? Wait, Nate is not owner of Board anymore)
    // Actually, `requestMint` is `onlyOwner`. We gave Board to AI.
    // Nate requests via the AI? Or the AI decides?
    // Let's assume Nate has a function or AI monitors value.
    // Re-reading contract: `requestMint` is `onlyOwner`.
    // So only the AI can request? That's fully autonomous.
    // But Nate wants money. 
    // Let's say Nate triggers the AI agent to request.

    console.log("   -> AI Agent detects value increase. Calculating Mint...");

    // Total Value added by ZK Proof = 4 hours * $250 = $1000
    // Max Mint allowed = $1000 / 1.5 (CR) = 666.66 NATE
    // We request 600 to be safe.
    const mintAmount = hre.ethers.parseEther("600");

    // AI Agent (Owner) requests mint
    // DEBUG: Check owners
    console.log(`   [DEBUG] Board Owner: ${await board.owner()}`);
    console.log(`   [DEBUG] AI Agent:    ${aiAgent.address}`);
    console.log(`   [DEBUG] Engine Owner:${await engine.owner()}`);
    console.log(`   [DEBUG] Board Addr:  ${await board.getAddress()}`);

    await board.connect(aiAgent).requestMint(mintAmount);
    console.log("   -> Mint Requested. Analyzing Sentiment...");

    // ==========================================================
    // 5. SENTIMENT ANALYSIS & EXECUTION
    // ==========================================================

    // Simulate API Call
    const sentimentScore = 85; // Positive
    console.log(`   -> Sentiment Score: ${sentimentScore}/100 (BULLISH)`);

    if (sentimentScore > 50) {
        console.log("   -> AI APPROVED. Executing...");
        await board.connect(aiAgent).approveMint(0);

        const balance = await token.balanceOf(aiAgent.address); // Board sends to Owner (AI Agent here)
        // Wait, Board sends to owner(). Owner is AI Agent.
        // Ideally Owner should be Nate, and AI Agent is a "Guardian".
        // But for this demo structure, AI Agent holds the bag.
        console.log(`   -> Mint Success. AI Agent Balance: ${hre.ethers.formatEther(balance)} $NATE`);
    } else {
        console.log("   -> AI VETOED. Market too fearful.");
        await board.connect(aiAgent).vetoMint(0, "Bad Vibes");
    }

    console.log("\n✅ PHASE 3 DEMO COMPLETE");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
