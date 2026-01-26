const hre = require("hardhat");

/**
 * 🎰 TASK MARKET DEMO
 * Simulates the full lifecycle of a Prediction Market for Nate's life.
 * Scenario: "Will Nate ship Phase 4 Mainnet today?"
 */
async function main() {
    console.clear();
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🎰 NATE PREDICTION MARKET DEMO                     ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    const [deployer, investor1, investor2, investor3] = await hre.ethers.getSigners();

    // 1. Deploy Core System (Token + Oracle + Market)
    console.log(">>> DEPLOYING CONTRACTS...");

    const LifeOracleV2 = await hre.ethers.getContractFactory("LifeOracleV2");
    // Mock Chainlink addresses
    const oracle = await LifeOracleV2.deploy(hre.ethers.ZeroAddress, hre.ethers.ZeroHash, 0);
    await oracle.waitForDeployment();
    console.log(`Step 1: LifeOracle deployed`);

    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    const token = await NateProtocol.deploy(deployer.address);
    await token.waitForDeployment();
    console.log(`Step 2: Token deployed`);

    const TaskMarket = await hre.ethers.getContractFactory("TaskMarket");
    const market = await TaskMarket.deploy(await token.getAddress(), await oracle.getAddress());
    await market.waitForDeployment();
    console.log(`Step 3: Market deployed\n`);

    // 1b. Genesis Mint (Simulation Only)
    // Since StabilityEngine isn't deployed here, we manually mint to fund the demo.
    console.log(">>> GENESIS MINT (DEMO SETUP)...");
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, deployer.address);
    await token.mint(deployer.address, hre.ethers.parseEther("10000")); // Mint 10k
    console.log("Minted 10,000 NATE to deployer for testing\n");

    // 2. Fund Investors
    console.log(">>> FUNDING INVESTORS...");
    const FUND_AMOUNT = hre.ethers.parseEther("1000"); // 1000 NATE each
    await token.transfer(investor1.address, FUND_AMOUNT);
    await token.transfer(investor2.address, FUND_AMOUNT);
    await token.transfer(investor3.address, FUND_AMOUNT);
    console.log("Investors funded with 1000 NATE each\n");

    // 3. Create a Market
    console.log(">>> CREATING MARKET...");
    const TASK_DESC = "Ship Phase 4 Mainnet by Midnight";
    const DURATION = 3600; // 1 hour

    // Horizon: 1 = DAILY
    await market.createTask(TASK_DESC, 1, DURATION);
    console.log(`Market Created: "${TASK_DESC}"`);
    console.log(`Status: OPEN\n`);

    // 4. Place Bets
    console.log(">>> PLACING BETS...");

    // Investor 1: BULLISH (Bets 500 on YES)
    await token.connect(investor1).approve(await market.getAddress(), hre.ethers.parseEther("500"));
    await market.connect(investor1).bet(1, true, hre.ethers.parseEther("500"));
    console.log("Investor 1 bets 500 NATE on [YES]");

    // Investor 2: BEARISH (Bets 300 on NO)
    await token.connect(investor2).approve(await market.getAddress(), hre.ethers.parseEther("300"));
    await market.connect(investor2).bet(1, false, hre.ethers.parseEther("300"));
    console.log("Investor 2 bets 300 NATE on [NO]");

    // Investor 3: BULLISH (Bets 200 on YES)
    // Late to the party, better odds? No, parimutuel pools don't have fixed odds until close.
    await token.connect(investor3).approve(await market.getAddress(), hre.ethers.parseEther("200"));
    await market.connect(investor3).bet(1, true, hre.ethers.parseEther("200"));
    console.log("Investor 3 bets 200 NATE on [YES]\n");

    // Check Odds
    const odds = await market.getOdds(1);
    console.log(">>> CURRENT MARKET SENTIMENT:");
    console.log(`YES Pool: ${hre.ethers.formatEther(await (await market.tasks(1)).yesPool)} NATE (${odds[0]}%)`);
    console.log(`NO Pool:  ${hre.ethers.formatEther(await (await market.tasks(1)).noPool)} NATE (${odds[1]}%)\n`);

    // 5. Simulate Time Passing & Resolution
    console.log(">>> ... 3 HOURS LATER ...");
    // Did Nate ship? YES!
    console.log("Oracle reports: Nate successfully deployed to Mainnet! (Outcome: YES)\n");

    // Deployer is owner/oracle for this mock
    await market.resolveTask(1, true);
    console.log("Market Resolved: YES WON\n");

    // 6. Claim Rewards
    console.log(">>> CLAIMING REWARDS...");

    // Total Pool = 500 + 300 + 200 = 1000 NATE
    // YES Pool = 700 NATE
    // NO Pool = 300 NATE (Lost)

    // Investor 1 (500 YES): Share = (500/700) * 1000 = ~714.28
    const bal1Before = await token.balanceOf(investor1.address);
    await market.connect(investor1).claimReward(1);
    const bal1After = await token.balanceOf(investor1.address);
    const profit1 = bal1After - bal1Before;
    console.log(`Investor 1 Wins: +${hre.ethers.formatEther(profit1)} NATE (Bet 500 -> ~714)`);

    // Investor 2 (300 NO): Wins nothing
    const bal2Before = await token.balanceOf(investor2.address);
    try {
        await market.connect(investor2).claimReward(1);
    } catch (e) {
        console.log(`Investor 2 Wins: 0 NATE (Bet 300 -> 0) [Expected Revert]`);
    }

    // Investor 3 (200 YES): Share = (200/700) * 1000 = ~285.71
    const bal3Before = await token.balanceOf(investor3.address);
    await market.connect(investor3).claimReward(1);
    const bal3After = await token.balanceOf(investor3.address);
    const profit3 = bal3After - bal3Before;
    console.log(`Investor 3 Wins: +${hre.ethers.formatEther(profit3)} NATE (Bet 200 -> ~285)`);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║           ✅ DEMO COMPLETE - MARKET WORKS                    ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
