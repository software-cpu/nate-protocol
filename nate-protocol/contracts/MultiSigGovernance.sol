// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiSigGovernance
 * @notice A lightweight multi-signature wallet with timelock for governing the Nate Protocol.
 * @dev Replaces the single EOA owner of GovernanceBoard.
 */
contract MultiSigGovernance is Ownable {

    // ============ Events ============

    event Submission(uint256 indexed transactionId);
    event Confirmation(address indexed sender, uint256 indexed transactionId);
    event Execution(uint256 indexed transactionId);
    event ExecutionFailure(uint256 indexed transactionId);
    
    // ============ Constants ============
    
    uint256 public constant MIN_DELAY = 24 hours; // Timelock
    
    // ============ State ============
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required; // Confirmations needed
    
    struct Transaction {
        address destination;
        uint256 value;
        bytes data;
        bool executed;
        uint256 unlockTime; // Earliest execution time
    }
    
    Transaction[] public transactions;
    
    // txId => owner => confirmed
    mapping(uint256 => mapping(address => bool)) public confirmations;

    // ============ Modifiers ============
    
    modifier onlyWallet() {
        require(msg.sender == address(this), "Not wallet");
        _;
    }

    modifier ownerDoesNotExist(address owner) {
        require(!isOwner[owner], "Owner exists");
        _;
    }

    modifier ownerExists(address owner) {
        require(isOwner[owner], "Owner does not exist");
        _;
    }

    modifier transactionExists(uint256 transactionId) {
        require(transactions[transactionId].destination != address(0), "Tx does not exist");
        _;
    }

    modifier confirmed(uint256 transactionId, address owner) {
        require(confirmations[transactionId][owner], "Tx not confirmed");
        _;
    }

    modifier notConfirmed(uint256 transactionId, address owner) {
        require(!confirmations[transactionId][owner], "Tx already confirmed");
        _;
    }

    modifier notExecuted(uint256 transactionId) {
        require(!transactions[transactionId].executed, "Tx already executed");
        _;
    }
    
    modifier notLocked(uint256 transactionId) {
        require(block.timestamp >= transactions[transactionId].unlockTime, "Tx locked");
        _;
    }

    // ============ Constructor ============

    constructor(address[] memory _owners, uint256 _required) Ownable(msg.sender) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid requirement");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Invalid owner");
            require(!isOwner[_owners[i]], "Duplicate owner");
            
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        
        required = _required;
    }

    // ============ Core Logic ============

    /**
     * @notice Submit a new transaction for approval
     */
    function submitTransaction(address destination, uint256 value, bytes memory data)
        public
        ownerExists(msg.sender)
        returns (uint256 transactionId)
    {
        transactionId = transactions.length;
        
        transactions.push(Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false,
            unlockTime: 0 // Set when quorum reached
        }));
        
        // Auto-confirm for submitter
        confirmTransaction(transactionId);
        
        emit Submission(transactionId);
    }

    /**
     * @notice Confirm a pending transaction
     */
    function confirmTransaction(uint256 transactionId)
        public
        ownerExists(msg.sender)
        transactionExists(transactionId)
        notConfirmed(transactionId, msg.sender)
        notExecuted(transactionId)
    {
        confirmations[transactionId][msg.sender] = true;
        emit Confirmation(msg.sender, transactionId);
        
        // Check if Quorum Reached for the first time
        if (getConfirmationCount(transactionId) == required && transactions[transactionId].unlockTime == 0) {
            transactions[transactionId].unlockTime = block.timestamp + MIN_DELAY;
        }
    }

    /**
     * @notice Execute a confirmed and unlocked transaction
     */
    function executeTransaction(uint256 transactionId)
        public
        ownerExists(msg.sender)
        transactionExists(transactionId)
        notExecuted(transactionId)
        notLocked(transactionId)
    {
        require(getConfirmationCount(transactionId) >= required, "Quorum not reached"); // Re-check
        
        Transaction storage txn = transactions[transactionId];
        txn.executed = true;
        
        (bool success, ) = txn.destination.call{value: txn.value}(txn.data);
        if (success)
            emit Execution(transactionId);
        else {
            emit ExecutionFailure(transactionId);
            txn.executed = false; // Allow retry? Or fail permanently? Typically fail.
            // For safety, let's allow retry if it was a gas issue, but risk re-entrancy issues?
            // Reentrancy guard not strictly needed if we follow CEI, but here we modify state 'executed=true' before call.
            // If it fails, we set it back to false so it can be retried.
            // However, typical MultiSig implementations separate execute from state.
            // Let's keep it simple: if it fails, it throws event and stays unexecuted (executed=false).
            // But wait, I set executed=true above.
            txn.executed = false; 
        }
    }
    
    // ============ Views ============
    
    function getConfirmationCount(uint256 transactionId) public view returns (uint256 count) {
        for (uint256 i = 0; i < owners.length; i++)
            if (confirmations[transactionId][owners[i]])
                count += 1;
    }
    
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    receive() external payable {}
}
