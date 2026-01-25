const hre = require("hardhat");

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Interacting as:", owner.address);

  const nate = await hre.ethers.getContractAt("NateProtocol", CONTRACT_ADDRESS);

  // ============ Get Current State ============
  console.log("\n📊 CURRENT STATE");
  console.log("================");
  
  const stats = await nate.getSystemStats();
  console.log("Total Supply:", hre.ethers.formatEther(stats[0]), "NATE");
  console.log("Treasury Value:", hre.ethers.formatEther(stats[1]), "ETH");
  console.log("Total Backing:", hre.ethers.formatEther(stats[2]));
  console.log("NAV per Token:", hre.ethers.formatEther(stats[3]));
  console.log("Total Burned:", hre.ethers.formatEther(stats[4]), "NATE");
  console.log("Total Staked:", hre.ethers.formatEther(stats[5]), "NATE");
  console.log("Opportunities:", stats[6].toString());
  console.log("Crisis Mode:", stats[7]);

  // ============ Test Actions ============
  console.log("\n🎯 TEST ACTIONS");
  console.log("===============");

  // 1. Log an opportunity
  console.log("\n1. Logging a test opportunity...");
  const tx1 = await nate.logOpportunity(
    "JOB",
    "Test: Senior Solidity Developer Position",
    hre.ethers.parseEther("150000")
  );
  await tx1.wait();
  console.log("   ✅ Opportunity logged!");

  // 2. Update life metrics
  console.log("\n2. Updating life metrics...");
  const tx2 = await nate.updateLifeMetrics(
    hre.ethers.parseEther("300000"),  // Time value
    hre.ethers.parseEther("200000"),  // Skill value
    hre.ethers.parseEther("150000"),  // Network value
    hre.ethers.parseEther("250000")   // Future earnings
  );
  await tx2.wait();
  console.log("   ✅ Metrics updated!");

  // 3. Simulate revenue
  console.log("\n3. Sending test revenue (0.1 ETH)...");
  const tx3 = await nate.distributeRevenue({ value: hre.ethers.parseEther("0.1") });
  await tx3.wait();
  console.log("   ✅ Revenue distributed!");

  // ============ Final State ============
  console.log("\n📊 UPDATED STATE");
  console.log("================");
  
  const newStats = await nate.getSystemStats();
  console.log("Treasury Value:", hre.ethers.formatEther(newStats[1]), "ETH");
  console.log("Total Backing:", hre.ethers.formatEther(newStats[2]));
  console.log("NAV per Token:", hre.ethers.formatEther(newStats[3]));
  console.log("Opportunities:", newStats[6].toString());

  // Check time to crisis
  const ttc = await nate.timeToCrisis();
  console.log("\nTime to Crisis:", Math.floor(Number(ttc) / 86400), "days");

  // Get active opportunities
  const active = await nate.getActiveOpportunities();
  console.log("\nActive Opportunities:", active.map(n => n.toString()));

  console.log("\n🎉 Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
