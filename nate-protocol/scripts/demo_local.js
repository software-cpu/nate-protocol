const hre = require("hardhat");

async function main() {
    console.log("🎬 STARTING NATE PROTOCOL LOCAL DEMO 🎬");
    console.log("=========================================\n");

    const [nate, communityMember, rando] = await hre.ethers.getSigners();
    console.log(`👤 Actors:`);
    console.log(`   Nate (Admin/Creator):     ${nate.address}`);
    console.log(`   Community Member:         ${communityMember.address}`);
    console.log(`   Rando:                    ${rando.address}\n`);

    // ==========================================================
    // 1. DEPLOYMENT
    // ==========================================================
    console.log("--- 1. DEPLOYMENT PHASE ---");

    // Deploy LifeOracle
    const LifeOracle = await hre.ethers.getContractFactory("LifeOracle");
    const oracle = await LifeOracle.deploy();
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log(`✅ LifeOracle deployed:      ${oracleAddress}`);

    // Deploy NateProtocol
    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    const token = await NateProtocol.deploy(nate.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log(`✅ NateProtocol deployed:    ${tokenAddress}`);

    // Deploy StabilityEngine
    const StabilityEngine = await hre.ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(tokenAddress, oracleAddress);
    await engine.waitForDeployment();
    const engineAddress = await engine.getAddress();
    console.log(`✅ StabilityEngine deployed: ${engineAddress}`);

    // Wiring permissions
    console.log(`\n🔗 Configuring Permissions...`);
    await token.setStabilityEngine(engineAddress);
    console.log(`   -> Engine granted MINTER_ROLE on Token`);

    // Fund the Stability Engine with some initial "Liquid Capital" (ETH)
    // In reality, this comes from token sales, but here Nate seeds it.
    console.log(`💰 Seeding Treasury with 10 ETH...`);
    await nate.sendTransaction({
        to: engineAddress,
        value: hre.ethers.parseEther("10.0")
    });
    console.log(`   -> Treasury Balance: 10 ETH`);


    // ==========================================================
    // 2. ORACLE UPDATE & MINTING (Human QE)
    // ==========================================================
    console.log("\n--- 2. HUMAN QUANTITATIVE EASING ---");

    // Nate updates his stats
    console.log("📊 Nate updates Life Metrics...");
    // time, skill, network, earnings, verificationScore
    await oracle.updateMetrics(
        hre.ethers.parseUnits("1000", 18), // Time Value
        hre.ethers.parseUnits("5000", 18), // Skill Value
        hre.ethers.parseUnits("2000", 18), // Network Value
        hre.ethers.parseUnits("500", 18),  // Projected Earnings
        100 // Score
    );

    const totalValue = await oracle.getTotalValue();
    console.log(`   -> Total Human Value: $${hre.ethers.formatEther(totalValue)}`);

    // Minting NATE against this value
    // Max Mint = (Total Value / 1.5) - CurrentSupply
    // Let's safe mint 1000 NATE
    console.log("🖨️  Minting 1,000 $NATE...");
    await engine.mint(hre.ethers.parseEther("1000"));

    const nateBalance = await token.balanceOf(nate.address);
    console.log(`   -> Nate's Balance: ${hre.ethers.formatEther(nateBalance)} $NATE`);


    // ==========================================================
    // 3. ECOSYSTEM ACTIVITY
    // ==========================================================
    console.log("\n--- 3. ECOSYSTEM ACTIVITY ---");

    // Distribute to community
    console.log("💸 Nate pays Community Member 100 $NATE for a service...");
    await token.transfer(communityMember.address, hre.ethers.parseEther("100"));
    console.log(`   -> Member Balance: 100 $NATE`);

    // Staking
    console.log("🔒 Member stakes 50 $NATE for Governance...");
    await token.connect(communityMember).stake(hre.ethers.parseEther("50"));
    const stakedBal = await token.stakedBalance(communityMember.address);
    console.log(`   -> Member Staked: ${hre.ethers.formatEther(stakedBal)} $NATE`);

    // Opportunities
    console.log("📋 Nate creates an Opportunity: 'Build Frontend'");
    await token.logOpportunity("Dev", "Build the website", hre.ethers.parseEther("500"));

    // Member claims it
    console.log("🙋 Member claims the opportunity...");
    // Need opportunity ID 1
    await token.connect(communityMember).claimOpportunity(1);
    console.log("   -> Claimed!");


    // ==========================================================
    // 4. REDEMPTION (The Peg Limit)
    // ==========================================================
    console.log("\n--- 4. REDEMPTION / EXIT ---");

    const memberNate = await token.balanceOf(communityMember.address);
    console.log(`🛑 Member decides to cash out remaining ${hre.ethers.formatEther(memberNate)} $NATE...`);

    // Check ETH price in Engine (for this demo it's hardcoded or settable)
    // Default in contract might be $2500 per ETH
    // So 50 NATE ($50) should get 50/2500 = 0.02 ETH

    const initialMemberEth = await hre.ethers.provider.getBalance(communityMember.address);

    await token.connect(communityMember).approve(engineAddress, memberNate);
    // Note: StabilityEngine currently doesn't use transferFrom, it calls burn directly? 
    // Wait, StabilityEngine.redeem calls `nateToken.burn(msg.sender, amount)`.
    // ERC20Burnable `burn` burns from msg.sender.
    // The Engine needs MINTER_ROLE (which includes Burn capability usually? No, Burnable is usually public or owner).
    // Let's check logic:
    // StabilityEngine.redeem() -> nateToken.burn(msg.sender, amount).
    // The Engine calls token.burn(). msg.sender for token.burn() is the Engine.
    // BUT token.burn(from, amount) (if using AccessControl based burn) checks if msg.sender has role.
    // The NateProtocol.sol has:
    // function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) { _burn(from, amount); }
    // So yes, Engine has MINTER_ROLE, so it can burn from anyone?
    // Usually `_burn(from, amount)` implies `from` is the account losing tokens.
    // Standard ERC20 logic allows authorized operators to burn.
    // Let's verify:

    await engine.connect(communityMember).redeem(memberNate);

    const finalMemberEth = await hre.ethers.provider.getBalance(communityMember.address);
    const ethGained = finalMemberEth - initialMemberEth; // Close enough (minus gas)

    console.log(`   -> Redemption Successful!`);
    // Approximate gas costs make exact diff checks hard, but let's see balances
    console.log(`   -> Member ETH Balance Change: +~${hre.ethers.formatEther(ethGained)} ETH`);
    console.log(`   -> Member $NATE Balance: ${hre.ethers.formatEther(await token.balanceOf(communityMember.address))}`);


    console.log("\n-----------------------------------------");
    console.log("✅ DEMO COMPLETED SUCCESSFULLY");
    console.log("-----------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
