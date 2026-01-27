const hre = require("hardhat");

const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";

// Set this to your subscription ID if you already have one
const EXISTING_SUB_ID = 6193n;

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const oracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);
    const linkToken = await hre.ethers.getContractAt(["function transferAndCall(address,uint256,bytes) returns (bool)"], SEPOLIA_LINK_TOKEN, signer);
    const router = await hre.ethers.getContractAt(["function addConsumer(uint64,address)", "function getSubscription(uint64) view returns (uint96,uint96,address,address[],bytes[])"], SEPOLIA_ROUTER, signer);

    // 1. Check Contract State
    const currentSubId = await oracle.subscriptionId();
    console.log(`\nContract Subscription ID: ${currentSubId}`);

    let subIdToUse = currentSubId > 0n ? currentSubId : EXISTING_SUB_ID;

    if (subIdToUse === 0n) {
        console.log("⚠️  No Subscription ID found!");
        console.log("   Please create one at: https://functions.chain.link/sepolia");
        console.log("   Then update EXISTING_SUB_ID in this script.");
        return;
    }

    console.log(`Using Subscription ID: ${subIdToUse}`);

    // 2. Fund Subscription
    console.log("\nFunding Subscription with 3 LINK...");
    try {
        const tx = await linkToken.transferAndCall(
            SEPOLIA_ROUTER,
            3000000000000000000n, // 3 LINK
            hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [subIdToUse]),
            { gasLimit: 300000 }
        );
        await tx.wait();
        console.log("✅ Subscription Funded.");
    } catch (e) {
        console.log("⚠️  Could not fund (maybe low LINK balance or already funded).");
    }

    // 3. Add Consumer
    console.log(`\nAdding Consumer: ${OBSERVER_ADDRESS}...`);
    try {
        const tx = await router.addConsumer(subIdToUse, OBSERVER_ADDRESS, { gasLimit: 300000 });
        await tx.wait();
        console.log("✅ Consumer Added.");
    } catch (e) {
        console.log("⚠️  Consumer likely already added.");
    }

    // 4. Update Contract if needed
    if (currentSubId !== subIdToUse) {
        console.log("\nUpdating Contract Subscription ID...");
        const tx = await oracle.setSubscriptionId(subIdToUse);
        await tx.wait();
        console.log("✅ Contract Updated.");
    }

    console.log("\n🎉 Chainlink Setup Verified!");
}

main().catch(console.error);
