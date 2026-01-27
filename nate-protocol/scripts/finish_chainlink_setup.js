const hre = require("hardhat");

const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const SEPOLIA_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const LINK_AMOUNT = "3000000000000000000"; // 3 LINK
const OBSERVER_ADDRESS = "0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB";
const SUB_ID = 6193n;

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const routerAbi = [
        "function addConsumer(uint64 subscriptionId, address consumer) external"
    ];
    const linkAbi = [
        "function transferAndCall(address to, uint256 value, bytes data) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)"
    ];

    const router = await hre.ethers.getContractAt(routerAbi, SEPOLIA_ROUTER, signer);
    const linkToken = await hre.ethers.getContractAt(linkAbi, SEPOLIA_LINK_TOKEN, signer);

    // 1. Fund Subscription
    console.log(`\nFunding Subscription ${SUB_ID} with 3 LINK...`);
    const fundTx = await linkToken.transferAndCall(
        SEPOLIA_ROUTER,
        LINK_AMOUNT,
        hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [SUB_ID]),
        { gasLimit: 300000 }
    );
    await fundTx.wait();
    console.log("✅ Subscription Funded with 3 LINK.");

    // 2. Add Consumer
    console.log(`\nAdding Consumer: ${OBSERVER_ADDRESS}...`);
    const addTx = await router.addConsumer(SUB_ID, OBSERVER_ADDRESS, { gasLimit: 300000 });
    await addTx.wait();
    console.log("✅ Consumer Added.");

    // 3. Update Contract
    console.log("\nUpdating LifeOracleV2 with Subscription ID...");
    const LifeOracle = await hre.ethers.getContractAt("LifeOracleV2", OBSERVER_ADDRESS, signer);
    const updateTx = await LifeOracle.setSubscriptionId(SUB_ID, { gasLimit: 100000 });
    await updateTx.wait();
    console.log("✅ LifeOracleV2 updated.");

    console.log("\n🎉 Chainlink Setup COMPLETE!");
    console.log(`Subscription ID: ${SUB_ID}`);
}

main().catch(console.error);
