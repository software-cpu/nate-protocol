const { ethers } = require("hardhat");

async function main() {
    console.log("-----------------------------------------");
    console.log("   ZK-EMAIL SIMULATION: PRIVATE WORK     ");
    console.log("-----------------------------------------");

    const [owner, user] = await ethers.getSigners();

    // 1. Deploy Mocks
    console.log("1. Deploying ZK Infrastructure...");

    const DKIMRegistry = await ethers.getContractFactory("DKIMRegistry");
    const registry = await DKIMRegistry.deploy();
    await registry.waitForDeployment();
    console.log("   - DKIMRegistry deployed");

    const MockVerifier = await ethers.getContractFactory("MockGroth16Verifier");
    const verifier = await MockVerifier.deploy();
    await verifier.waitForDeployment();
    console.log("   - Groth16 Verifier deployed");

    const ZkLifeOracle = await ethers.getContractFactory("ZkLifeOracle");
    // Mock Chainlink params
    const router = ethers.ZeroAddress;
    const donId = ethers.encodeBytes32String("fun-optimism-1");

    // Note: LifeOracleV2 constructor expects (router, donId, subId)
    // We are deploying ZkLifeOracle which expects (router, donId, subId, verifier, registry)
    const oracle = await ZkLifeOracle.deploy(
        router,
        donId,
        0,
        await verifier.getAddress(),
        await registry.getAddress()
    );
    await oracle.waitForDeployment();
    console.log("   - ZkLifeOracle deployed");

    // 2. Setup Registry (Whitelisting Gmail)
    console.log("\n2. Configuring Registry...");
    const gmailDomain = "gmail.com";
    const gmailDomainHash = ethers.keccak256(ethers.toUtf8Bytes(gmailDomain));

    // Mock Public Key for Gmail (normally 2048-bit RSA key hash)
    const mockPublicKey = ethers.keccak256(ethers.toUtf8Bytes("rsa-key-2024-01-25"));

    await registry.setDKIMKey(gmailDomain, mockPublicKey);
    console.log(`   - Whitelisted ${gmailDomain} (Hash: ${gmailDomainHash.slice(0, 10)}...)`);

    // 3. Generate "Private" Inputs (Simulation)
    console.log("\n3. Simulating Client Email...");
    console.log("   [EMAIL CONTENT] 'Subject: Invoice Approved. Hours: 52'");
    console.log("   [SIGNATURE] DKIM-Signature found from 'gmail.com'");

    const hoursWorked = 52;
    const nullifier = ethers.keccak256(ethers.toUtf8Bytes("email-id-12345"));

    // 4. Generate Proof Signals
    // [dkimPubKeyHash, domainHash, value, nullifier]
    // Note: In real ZK, these are outputs of the circuit.
    // In our MockVerifier, we just need to pass them to the contract.
    const signals = [
        BigInt(mockPublicKey),     // Must match registry
        BigInt(gmailDomainHash),   // Must match registry
        BigInt(hoursWorked),       // Extracted value
        BigInt(nullifier)          // Unique ID
    ];

    // Dummy Proof
    const pA = [0, 0];
    const pB = [[0, 0], [0, 0]];
    const pC = [0, 0];

    // 5.  Verify On-Chain
    console.log("\n4. Submitting Proof to Oracle...");

    const tx = await oracle.submitSecretWorkProof(pA, pB, pC, signals);
    await tx.wait();

    console.log("   ✅ Proof Verified on-chain!");
    console.log("   ✅ DKIM Signature Validated against Registry");
    console.log("   ✅ Nullifier checked (Double-Spend Protection)");

    // 6. Check Metrics
    console.log("\n5. Checking Oracle State...");
    const metrics = await oracle.metrics();
    console.log(`   - Total Hours: ${metrics.deepWorkHours}`);
    console.log(`   - Total Value: $${ethers.formatEther(metrics.totalValue)}`);

    console.log("\n-----------------------------------------");
    console.log("   DEMO COMPLETE: PRIVACY PRESERVED      ");
    console.log("-----------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
