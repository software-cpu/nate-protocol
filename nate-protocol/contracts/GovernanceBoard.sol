// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StabilityEngine.sol";

/**
 * @title GovernanceBoard (Phase 3: AI Security)
 * @notice The "Algo-Board" that governs the Stability Engine.
 * @dev Functions as an optimistic timelock / AI-agent approval gate.
 * Nate requests a mint, and the "Board" (AI Agent) must approve logic or 
 * Veto it based on market sentiment.
 */
contract GovernanceBoard is Ownable {

    StabilityEngine public engine;
    
    // Config
    uint256 public constant MINT_DELAY = 1 hours;
    uint256 public constant VETO_THRESHOLD = 50000 * 1e18; // 50k NATE requires review

    struct MintRequest {
        uint256 amount;
        uint256 timestamp;
        bool executed;
        bool vetoed;
    }

    MintRequest[] public requests;
    
    event MintRequested(uint256 indexed requestId, uint256 amount);
    event MintApproved(uint256 indexed requestId, address indexed aiAgent);
    event MintVetoed(uint256 indexed requestId, string reason);

    constructor(address _engine) Ownable(msg.sender) {
        engine = StabilityEngine(payable(_engine));
    }

    // ============ User Actions ============

    /**
     * @dev Nate requests to mint. If small amount, maybe auto-approve?
     * For now, everything goes through the Board.
     */
    function requestMint(uint256 _amount) external onlyOwner {
        requests.push(MintRequest({
            amount: _amount,
            timestamp: block.timestamp,
            executed: false,
            vetoed: false
        }));
        
        emit MintRequested(requests.length - 1, _amount);
    }

    // ============ AI Agent Actions ============

    /**
     * @dev The AI Agent calls this after analyzing Social Sentiment/Market Data.
     */
    function approveMint(uint256 _requestId) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        require(!req.executed, "Already executed");
        require(!req.vetoed, "Vetoed");
        
        // Execute the mint on the engine
        req.executed = true;
        engine.mint(req.amount);
        // Transfer the minted tokens to Nate (Owner)
        // Note: engine.mint() mints to msg.sender (this contract)
        INateToken(address(engine.nateToken())).transfer(owner(), req.amount);

        emit MintApproved(_requestId, msg.sender);
    }

    function vetoMint(uint256 _requestId, string calldata _reason) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        req.vetoed = true;
        emit MintVetoed(_requestId, _reason);
    }
}
