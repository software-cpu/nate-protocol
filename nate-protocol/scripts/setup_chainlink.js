const hre = require("hardhat");

const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const LINK_AMOUNT = "3000000000000000000"; // 3 LINK
const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    // 1. Interfaces
    const routerAbi = [
        "function createSubscription() external returns (uint64)",
        "function addConsumer(uint64 subscriptionId, address consumer) external",
        "event SubscriptionCreated(uint64 indexed subscriptionId, address owner)"
    ];
    const linkAbi = [
        "function transferAndCall(address to, uint256 value, bytes data) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)"
    ];

    const router = await hre.ethers.getContractAt(routerAbi, SEPOLIA_ROUTER, signer);
    const linkToken = await hre.ethers.getContractAt(linkAbi, SEPOLIA_LINK_TOKEN, signer);

    // 2. Check Balance
    const balance = await linkToken.balanceOf(signer.address);
    console.log(`LINK Balance: ${hre.ethers.formatEther(balance)} LINK`);
    if (balance < BigInt(LINK_AMOUNT)) {
        throw new Error("Insufficient LINK");
    }

    // 3. Create Subscription
    console.log("\nCreating Subscription via Router (Low Level)...");
    const createTx = await router.createSubscription();
    const receipt = await createTx.wait();

    // Parse event to get ID
    const event = receipt.logs.find(log => {
        try { return router.interface.parseLog(log)?.name === "SubscriptionCreated"; }
        catch { return false; }
    });
    if (!event) throw new Error("Could not find SubscriptionCreated event");

    const parsedLog = router.interface.parseLog(event);
    const subId = parsedLog.args.subscriptionId;
    console.log(`✅ Subscription Created. ID: ${subId}`);

    // 4. Fund Subscription (TransferAndCall)
    console.log(`\nFunding Subscription ${subId} with 3 LINK...`);
    const fundTx = await linkToken.transferAndCall(
        SEPOLIA_ROUTER,
        LINK_AMOUNT,
        hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [subId])
    );
    await fundTx.wait();
    console.log("✅ Subscription Funded.");

    // 5. Add Consumer
    console.log(`\nAdding Consumer: ${OBSERVER_ADDRESS}...`);
    const addTx = await router.addConsumer(subId, OBSERVER_ADDRESS);
    await addTx.wait();
    console.log("✅ Consumer Added.");

    // 6. Update Contract
    console.log("\nUpdating LifeOracleV2 with new Subscription ID...");
    const LifeOracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);
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
