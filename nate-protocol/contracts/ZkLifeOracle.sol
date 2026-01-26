// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LifeOracleV2.sol";
import "./zk-email/DKIMRegistry.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[4] calldata _pubSignals // [dkimPubKeyHash, domainHash, value, nullifier]
    ) external view returns (bool);
}

/**
 * @title ZkLifeOracle (Phase 3: The Autonomous Self)
 * @notice Extends LifeOracleV2 to accept ZK-Email Proofs for "Secret Work".
 * @dev Verifies that an email from a trusted provider (Gmail) confirms work done.
 */
contract ZkLifeOracle is LifeOracleV2 {

    IGroth16Verifier public verifier;
    DKIMRegistry public dkimRegistry;

    // Track unused proofs to prevent replay attacks
    mapping(bytes32 => bool) public nullifiers;

    event SecretWorkVerified(bytes32 indexed domainHash, uint256 hoursWorked, uint256 valueAdded);

    constructor(
        address _router, 
        bytes32 _donId, 
        uint64 _subId,
        address _verifier,
        address _dkimRegistry
    ) LifeOracleV2(_router, _donId, _subId) {
        verifier = IGroth16Verifier(_verifier);
        dkimRegistry = DKIMRegistry(_dkimRegistry);
    }

    /**
     * @notice Prove productivity using ZK-Email
     * @dev 
     * Signals:
     * [0] = dkimPublicKeyHash (Must match Registry)
     * [1] = domainHash (e.g. hash("gmail.com"))
     * [2] = extractedValue (Hours worked found via Regex)
     * [3] = nullifier (Unique email ID to prevent double-spend)
     */
    function submitSecretWorkProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[4] calldata _pubSignals
    ) external {
        // 1. Verify Public Inputs against Registry
        bytes32 pubKeyHash = bytes32(_pubSignals[0]);
        bytes32 domainHash = bytes32(_pubSignals[1]);
        
        // Ensure this domain and key are trusted by us
        require(dkimRegistry.isKeyValid(domainHash, pubKeyHash), "Invalid/Untrusted Mail Provider");

        // 2. Prevent Double Spending
        bytes32 nullifier = bytes32(_pubSignals[3]);
        require(!nullifiers[nullifier], "Email already used");
        nullifiers[nullifier] = true;

        // 3. Verify the ZK Proof validity
        require(verifier.verifyProof(_pA, _pB, _pC, _pubSignals), "Invalid ZK Proof");

        // 4. Update Metrics
        // Extracted Value is "Hours Worked"
        uint256 hoursWorked = _pubSignals[2];
        
        // Sanity check: Don't allow claiming 1000 hours in one email
        require(hoursWorked > 0 && hoursWorked < 100, "Invalid hours range");

        // Protect against uint8 overflow (max 255 hours)
        uint8 newHours = metrics.deepWorkHours + uint8(hoursWorked);
        require(newHours >= metrics.deepWorkHours, "Hours overflow");
        metrics.deepWorkHours = newHours;
        
        // Calculate Value (e.g. $250/hr)
        uint256 valueAdd = (hoursWorked * 250 * 1e18);
        metrics.totalValue += valueAdd;

        emit SecretWorkVerified(domainHash, hoursWorked, valueAdd);
    }
}
