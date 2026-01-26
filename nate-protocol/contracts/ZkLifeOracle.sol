// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LifeOracleV2.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title ZkLifeOracle (Phase 3: The Autonomous Self)
 * @notice Extends LifeOracleV2 to accept Zero-Knowledge Proofs for "Secret Work".
 * @dev Nate can prove he is working (hours > threshold) without revealing the project name.
 */
contract ZkLifeOracle is LifeOracleV2 {

    IGroth16Verifier public verifier;

    // Track unused proofs to prevent replay attacks
    mapping(bytes32 => bool) public nullifiers;

    event SecretWorkVerified(bytes32 indexed projectHash, uint256 creditScore);

    constructor(
        address _router, 
        bytes32 _donId, 
        uint64 _subId,
        address _verifier
    ) LifeOracleV2(_router, _donId, _subId) {
        verifier = IGroth16Verifier(_verifier);
    }

    /**
     * @notice Prove productivity using ZK-SNARKs
     * @dev Verifies that deepWorkHours >= minThreshold AND hash(project) == publicHash
     * @param _pA Groth16 Proof A
     * @param _pB Groth16 Proof B
     * @param _pC Groth16 Proof C
     * @param _pubSignals [0] = minHoursThreshold, [1] = projectHash estimated
     */
    function submitSecretWorkProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals
    ) external {
        // 1. Verify the Proof
        require(verifier.verifyProof(_pA, _pB, _pC, _pubSignals), "Invalid ZK Proof");

        // 2. Prevent Double Spending (Replay Attack)
        // In a real circuit, we'd output a 'nullifierHash' signal. 
        // Here we hash the proof itself for simplicity in this demo.
        bytes32 proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC));
        require(!nullifiers[proofHash], "Proof already used");
        nullifiers[proofHash] = true;

        // 3. Update Metrics (Credit Score)
        // If proven, we bump the "Deep Work" metric in the struct
        // This is a "Local Override" of the Chainlink data
        metrics.deepWorkHours += 4; // Add 4 hours (proven block)
        metrics.totalValue += (4 * 250 * 1e18); // $250/hr * 4

        emit SecretWorkVerified(bytes32(_pubSignals[1]), metrics.totalValue);
    }
}
