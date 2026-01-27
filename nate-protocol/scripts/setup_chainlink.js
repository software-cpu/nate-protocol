const { SubscriptionManager } = require("@chainlink/functions-toolkit");
const hre = require("hardhat");

const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const LINK_AMOUNT = "3000000000000000000"; // 3 LINK

// Deployed LifeOracleV2 Address (Auto-filled or manual)
const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    // 1. Initialize Subscription Manager
    const sm = new SubscriptionManager({
        signer: signer,
        linkTokenAddress: SEPOLIA_LINK_TOKEN,
        functionsRouterAddress: SEPOLIA_ROUTER,
    });

    await sm.initialize();

    // 2. Check LINK Balance
    const linkToken = await hre.ethers.getContractAt(
        ["function balanceOf(address) view returns (uint256)"],
        SEPOLIA_LINK_TOKEN
    );
    const balance = await linkToken.balanceOf(signer.address);
    console.log(`LINK Balance: ${hre.ethers.formatEther(balance)} LINK`);

    if (balance < BigInt(LINK_AMOUNT)) {
        console.error("❌ Insufficient LINK! Please get at least 3 LINK from https://faucets.chain.link/sepolia");
        process.exit(1);
    }

    // 3. Create Subscription
    console.log("\nCreating Chainlink Functions Subscription...");
    const subId = await sm.createSubscription();
    console.log(`✅ Subscription Created. ID: ${subId}`);

    // 4. Fund Subscription
    console.log(`\nFunding Subscription ${subId} with 3 LINK...`);
    const fundTx = await sm.fundSubscription({
        subscriptionId: subId,
        amountInJuels: LINK_AMOUNT,
    });
    await fundTx.wait();
    console.log("✅ Subscription Funded.");

    // 5. Add Consumer (LifeOracleV2)
    console.log(`\nAdding Consumer: ${OBSERVER_ADDRESS}...`);
    const addTx = await sm.addConsumer({
        subscriptionId: subId,
        consumerAddress: OBSERVER_ADDRESS,
    });
    await addTx.wait();
    console.log("✅ Consumer Added.");

    // 6. Update Contract with new Sub ID
    console.log("\nUpdating LifeOracleV2 with new Subscription ID...");
    const LifeOracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS);
    const updateTx = await LifeOracle.setSubscriptionId(subId);
    await updateTx.wait();
    console.log("✅ LifeOracleV2 updated.");

    console.log("\n🎉 Chainlink Setup Complete!");
    console.log(`Sub ID: ${subId}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
