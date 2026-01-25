const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying NateProtocol...\n");

  const [deployer, council, treasury] = await hre.ethers.getSigners();
  
  console.log("Deployer (Nate):", deployer.address);
  console.log("Council:", council?.address || "Using deployer as council for testing");
  console.log("Treasury Reserve:", treasury?.address || "Using deployer as treasury for testing");
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // For local testing, use deployer for all roles
  // In production, use separate addresses
  const councilAddress = council?.address || deployer.address;
  const treasuryAddress = treasury?.address || deployer.address;

  // Deploy
  const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
  const nate = await NateProtocol.deploy(councilAddress, treasuryAddress);
  
  await nate.waitForDeployment();
  const address = await nate.getAddress();

  console.log("✅ NateProtocol deployed to:", address);
  console.log("\n📊 Initial State:");
  
  // Get stats
  const stats = await nate.getSystemStats();
  console.log("   Total Supply:", hre.ethers.formatEther(stats[0]), "NATE");
  console.log("   Treasury:", hre.ethers.formatEther(stats[1]), "ETH");
  console.log("   Total Backing:", hre.ethers.formatEther(stats[2]));
  console.log("   NAV per Token:", hre.ethers.formatEther(stats[3]));
  
  // Distribution check
  const deployerBalance = await nate.balanceOf(deployer.address);
  const contractBalance = await nate.balanceOf(address);
  const treasuryBalance = await nate.balanceOf(treasuryAddress);
  
  console.log("\n📦 Token Distribution:");
  console.log("   Nate (30%):", hre.ethers.formatEther(deployerBalance), "NATE");
  console.log("   Community Pool (50%):", hre.ethers.formatEther(contractBalance), "NATE");
  console.log("   Treasury Reserve (20%):", hre.ethers.formatEther(treasuryBalance), "NATE");

  // Save deployment info
  console.log("\n📝 Save these addresses:");
  console.log(`   CONTRACT_ADDRESS=${address}`);
  console.log(`   COUNCIL_ADDRESS=${councilAddress}`);
  console.log(`   TREASURY_ADDRESS=${treasuryAddress}`);

  // Verify on testnet/mainnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await nate.deploymentTransaction().wait(6);
    
    console.log("🔍 Verifying on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [councilAddress, treasuryAddress],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
  return { nate, address, councilAddress, treasuryAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
