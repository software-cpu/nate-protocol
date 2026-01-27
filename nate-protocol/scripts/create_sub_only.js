const hre = require("hardhat");

const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const routerAbi = [
        "function createSubscription() external returns (uint64)",
        "event SubscriptionCreated(uint64 indexed subscriptionId, address owner)"
    ];

    const router = await hre.ethers.getContractAt(routerAbi, SEPOLIA_ROUTER, signer);

    console.log("Creating Subscription with MANUAL gas limit (300,000)...");

    // We force a conservative gas limit to avoid "insufficient funds" estimation errors
    const tx = await router.createSubscription({
        gasLimit: 300000
    });

    console.log("Transaction Sent:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    const event = receipt.logs.find(log => {
        try { return router.interface.parseLog(log)?.name === "SubscriptionCreated"; }
        catch { return false; }
    });

    if (event) {
        const parsedLog = router.interface.parseLog(event);
        console.log("\n✅ SUCCESS!");
        console.log(`Subscription ID: ${parsedLog.args.subscriptionId}`);
    } else {
        console.error("❌ Transaction succeded but could not find event?");
    }
}

main().catch(console.error);
