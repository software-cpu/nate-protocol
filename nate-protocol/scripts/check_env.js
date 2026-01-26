require("dotenv").config();

async function main() {
    console.log("--- Environment Check ---");

    const key = process.env.PRIVATE_KEY;
    if (!key) {
        console.log("❌ PRIVATE_KEY is MISSING or empty.");
    } else {
        console.log(`✅ PRIVATE_KEY found (Length: ${key.length})`);
        if (!key.startsWith("0x") && /^[0-9a-fA-F]+$/.test(key)) {
            console.log("   (Format: Hex without 0x prefix - Looks generic, might be valid)");
        } else if (key.startsWith("0x")) {
            console.log("   (Format: Starts with 0x - Hardhat usually accepts this)");
        } else {
            console.log("❌ PRIVATE_KEY seems to contain invalid characters (not hex).");
        }
    }

    const url = process.env.SEPOLIA_RPC_URL;
    if (!url) {
        console.log("❌ SEPOLIA_RPC_URL is MISSING or empty.");
    } else {
        console.log(`✅ SEPOLIA_RPC_URL found (Length: ${url.length})`);
        if (url.includes("YOUR_API_KEY")) {
            console.log("❌ URL still has 'YOUR_API_KEY' placeholder.");
        }
    }
    console.log("-------------------------");
}

main().catch(console.error);
