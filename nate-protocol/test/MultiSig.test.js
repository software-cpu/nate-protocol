const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigGovernance Security", function () {
    let MultiSig, multiSig;
    let GovernanceBoard, governanceBoard;
    let deployer, signer2, signer3, attacker;
    let owners;

    beforeEach(async function () {
        [deployer, signer2, signer3, attacker] = await ethers.getSigners();
        owners = [deployer.address, signer2.address, signer3.address];

        // 1. Deploy MultiSig
        MultiSig = await ethers.getContractFactory("MultiSigGovernance");
        multiSig = await MultiSig.deploy(owners, 2); // 2-of-3
        await multiSig.waitForDeployment();

        // 2. Deploy Safe Target (Mock GovernanceBoard)
        // We use the real GovernanceBoard but mock its dependencies for speed
        const NateToken = await ethers.getContractFactory("NateProtocol");
        const nateToken = await NateToken.deploy(deployer.address);

        // Mock Engines
        const engineStub = deployer.address; // Doesn't matter for ownership test
        const marketStub = deployer.address;

        GovernanceBoard = await ethers.getContractFactory("GovernanceBoard");
        governanceBoard = await GovernanceBoard.deploy(engineStub, marketStub);
        await governanceBoard.waitForDeployment();

        // Transfer ownership to MultiSig
        await governanceBoard.transferOwnership(await multiSig.getAddress());
    });

    it("Should accept ownership of GovernanceBoard", async function () {
        expect(await governanceBoard.owner()).to.equal(await multiSig.getAddress());
    });

    it("Should fail if non-owner tries to submit transaction", async function () {
        const payload = governanceBoard.interface.encodeFunctionData("transferOwnership", [attacker.address]);
        const target = await governanceBoard.getAddress();

        await expect(
            multiSig.connect(attacker).submitTransaction(target, 0, payload)
        ).to.be.revertedWith("Owner does not exist");
    });

    it("Should execute transaction only after Quorum AND Timelock", async function () {
        const target = await governanceBoard.getAddress();
        // Payload: Transfer ownership back to deployer
        const payload = governanceBoard.interface.encodeFunctionData("transferOwnership", [deployer.address]); // Generic "Admin" action

        // 1. Submit (Signature 1 of 2)
        const tx = await multiSig.connect(deployer).submitTransaction(target, 0, payload);
        const receipt = await tx.wait();
        const txId = 0; // First tx

        // Verify state
        let txn = await multiSig.transactions(txId);
        expect(txn.executed).to.be.false;
        expect(await multiSig.getConfirmationCount(txId)).to.equal(1);

        // 2. Try to execute early (Quorum not met)
        await expect(multiSig.executeTransaction(txId)).to.be.revertedWith("Quorum not reached");

        // 3. Confirm (Signature 2 of 2) -> Quorum Reached -> Timelock Starts
        await multiSig.connect(signer2).confirmTransaction(0);

        txn = await multiSig.transactions(txId);
        expect(txn.unlockTime).to.be.gt(0); // Timer started

        // 4. Try to execute early (Timelock active)
        await expect(multiSig.executeTransaction(txId)).to.be.revertedWith("Tx locked");

        // 5. Fast Forward Time (24h + 1s)
        await ethers.provider.send("evm_increaseTime", [24 * 3600 + 1]);
        await ethers.provider.send("evm_mine");

        // 6. Execute
        await expect(multiSig.executeTransaction(txId))
            .to.emit(multiSig, "Execution")
            .withArgs(txId);

        // Verify Effect
        expect(await governanceBoard.owner()).to.equal(deployer.address);
    });

    it("Should allow generic calls (e.g. setSystemParams)", async function () {
        const target = await governanceBoard.getAddress();
        // Encode PID setSystemParams(1,2,3,4)
        const payload = governanceBoard.interface.encodeFunctionData("setSystemParams", [1, 2, 3, 4]);

        // 1. Submit
        await multiSig.submitTransaction(target, 0, payload);
        // 2. Confirm
        await multiSig.connect(signer2).confirmTransaction(0);

        // 3. Fast Forward
        await ethers.provider.send("evm_increaseTime", [86401]);
        await ethers.provider.send("evm_mine");

        // 4. Execute
        await multiSig.executeTransaction(0);

        // Check result
        expect(await governanceBoard.base_Kp()).to.equal(1);
    });
});
