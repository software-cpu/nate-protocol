// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DKIMRegistry
 * @notice Stores the Public Keys for allowed Email Domains (e.g. gmail.com).
 * @dev Used by ZkLifeOracle to verify that a ZK Proof corresponds to a valid, authorized email provider.
 */
contract DKIMRegistry is Ownable {

    event DKIMKeySet(bytes32 indexed domainHash, bytes32 indexed publicKeyHash);
    event DKIMKeyRevoked(bytes32 indexed domainHash);

    // domainHash => publicKeyHash
    // We store hashes to save storage. The ZK Proof proves knowledge of the preimage.
    mapping(bytes32 => bytes32) public dkimKeys;

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the authorized public key for a domain
     * @param _domainString The domain (e.g. "gmail.com")
     * @param _publicKeyHash The hash of the RSA Public Key
     */
    function setDKIMKey(string calldata _domainString, bytes32 _publicKeyHash) external onlyOwner {
        bytes32 domainHash = keccak256(abi.encodePacked(_domainString));
        dkimKeys[domainHash] = _publicKeyHash;
        emit DKIMKeySet(domainHash, _publicKeyHash);
    }

    /**
     * @notice Revoke a key (e.g. if compromised or rotated)
     */
    function revokeDKIMKey(string calldata _domainString) external onlyOwner {
        bytes32 domainHash = keccak256(abi.encodePacked(_domainString));
        delete dkimKeys[domainHash];
        emit DKIMKeyRevoked(domainHash);
    }

    /**
     * @notice Check if a public key is valid for a domain
     */
    function isKeyValid(bytes32 _domainHash, bytes32 _publicKeyHash) external view returns (bool) {
        return dkimKeys[_domainHash] == _publicKeyHash && _publicKeyHash != bytes32(0);
    }
}
