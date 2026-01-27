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
    try {
        const balance = await linkToken.balanceOf(signer.address);
        console.log(`LINK Balance: ${hre.ethers.formatEther(balance)} LINK`);
    } catch (e) {
        console.log("Error checking LINK balance:", e.message);
    }

    // 3. Create Subscription
    console.log("\nCreating Subscription via Router (Low Level)...");
    let subId;
    try {
        const createTx = await router.createSubscription({ gasLimit: 500000 });
        console.log("Tx Sent:", createTx.hash);
        const receipt = await createTx.wait();

        const event = receipt.logs.find(log => {
            try { return router.interface.parseLog(log)?.name === "SubscriptionCreated"; }
            catch { return false; }
        });
        if (!event) throw new Error("Could not find SubscriptionCreated event");

        const parsedLog = router.interface.parseLog(event);
        subId = parsedLog.args.subscriptionId;
        console.log(`✅ Subscription Created. ID: ${subId}`);
    } catch (error) {
        console.error("\n❌ FAILED to create subscription:");
        console.error(error);
        process.exit(1);
    }

    // 4. Fund Subscription (TransferAndCall)
    console.log(`\nFunding Subscription ${subId} with 3 LINK...`);
    try {
        const fundTx = await linkToken.transferAndCall(
            SEPOLIA_ROUTER,
            LINK_AMOUNT,
            hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [subId]),
            { gasLimit: 500000 }
        );
        await fundTx.wait();
        console.log("✅ Subscription Funded.");
    } catch (error) {
        console.error("\n❌ FAILED to fund subscription:");
        console.error(error);
        process.exit(1);
    }

    // 5. Add Consumer
    console.log(`\nAdding Consumer: ${OBSERVER_ADDRESS}...`);
    try {
        const addTx = await router.addConsumer(subId, OBSERVER_ADDRESS, { gasLimit: 500000 });
        await addTx.wait();
        console.log("✅ Consumer Added.");
    } catch (error) {
        console.error("\n❌ FAILED to add consumer:");
        console.error(error);
        process.exit(1);
    }

    // 6. Update Contract
    console.log("\nUpdating LifeOracleV2 with new Subscription ID...");
    try {
        const LifeOracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);
        const updateTx = await LifeOracle.setSubscriptionId(subId, { gasLimit: 500000 });
        await updateTx.wait();
        console.log("✅ LifeOracleV2 updated.");
    } catch (error) {
        console.error("\n❌ FAILED to update contract:");
        console.error(error);
        process.exit(1);
    }

    console.log("\n🎉 Chainlink Setup Complete!");
    console.log(`Sub ID: ${subId}`);
}

main().catch((error) => {
    console.error("UNKNOWN ERROR:", error);
    process.exit(1);
});
