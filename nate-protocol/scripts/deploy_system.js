const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting $NATE Protocol Deployment...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer Balance:", hre.ethers.formatEther(balance), "ETH");

    // 1. Deploy LifeOracle
    const LifeOracle = await hre.ethers.getContractFactory("LifeOracle");
    const oracle = await LifeOracle.deploy();
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log("✅ LifeOracle deployed to:", oracleAddress);

    // 2. Deploy NateProtocol (Token)
    const NateProtocol = await hre.ethers.getContractFactory("NateProtocol");
    // Constructor takes 'admin' address
    const token = await NateProtocol.deploy(deployer.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ NateProtocol deployed to:", tokenAddress);

    // 3. Deploy StabilityEngine
    const StabilityEngine = await hre.ethers.getContractFactory("StabilityEngine");
    const engine = await StabilityEngine.deploy(tokenAddress, oracleAddress);
    await engine.waitForDeployment();
    const engineAddress = await engine.getAddress();
    console.log("✅ StabilityEngine deployed to:", engineAddress);

    // 4. Configuration
    console.log("🔗 Configuring Permissions...");

    // Link Token to Engine (Give Minter Role)
    const tx = await token.setStabilityEngine(engineAddress);
    await tx.wait();
    console.log("   -> StabilityEngine granted MINTER_ROLE on NateProtocol");

    console.log("\n🎉 Deployment Complete!");
    console.log("--------------------------------------------------");
    console.log(`LifeOracle:      ${oracleAddress}`);
    console.log(`NateProtocol:    ${tokenAddress}`);
    console.log(`StabilityEngine: ${engineAddress}`);
    console.log("--------------------------------------------------");

    // 5. Verification
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n⏳ Waiting for 6 block confirmations needed for verification...");
        // Wait for the last deployed contract (StabilityEngine)
        // Ideally wait for all, but typically waiting on the last one is enough time for all if they were sequential
        await engine.deploymentTransaction().wait(6);

        console.log("🔍 Verifying contracts on Etherscan...");

        const verify = async (address, args) => {
            try {
                await hre.run("verify:verify", {
                    address: address,
                    constructorArguments: args,
                });
            } catch (e) {
                console.log(`❌ Verification failed for ${address}:`, e.message);
            }
        };

        await verify(oracleAddress, []);
        await verify(tokenAddress, [deployer.address]);
        await verify(engineAddress, [tokenAddress, oracleAddress]);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
