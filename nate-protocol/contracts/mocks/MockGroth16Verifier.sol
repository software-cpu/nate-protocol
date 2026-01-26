// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockGroth16Verifier
 * @dev Mocks the behavior of a SnarkJS-generated Verifier contract.
 * ALWAYS returns true for the demo.
 */
contract MockGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals
    ) external view returns (bool) {
        // In reality, this performs Elliptic Curve Pairing checks (Pairing.sol)
        // For the demo, we trust the math works (since we can't compile .circom locally)
        return true;
    }
}
