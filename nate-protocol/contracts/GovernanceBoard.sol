// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StabilityEngine.sol";
import "./TaskMarket.sol";

/**
 * @title GovernanceBoard (Phase 5: Market-Driven)
 * @notice The "Algo-Board" that governs the Stability Engine using market signals.
 * @dev Uses a sigmoid function to scale mints based on market confidence.
 * 
 * ## Mathematical Model
 * The mint multiplier is calculated using a logistic (sigmoid) function:
 * 
 *   m(c) = 1 / (1 + e^(-k * (c - threshold)))
 * 
 * Where:
 *   c = market confidence (0-100%)
 *   threshold = 70 (center of the S-curve)
 *   k = steepness parameter (higher = sharper cutoff)
 * 
 * This creates a smooth, continuous function where:
 *   - c < 50%: multiplier approaches 0 (reject mint)
 *   - c = 70%: multiplier = 0.5 (50% of requested mint)
 *   - c > 90%: multiplier approaches 1 (full mint)
 */
contract GovernanceBoard is Ownable {

    StabilityEngine public engine;
    TaskMarket public market;
    
    // === Nonlinear Dynamics Parameters ===
    uint256 public constant CONFIDENCE_THRESHOLD = 70;  // Center of sigmoid (%)
    uint256 public constant STEEPNESS = 15;             // k parameter (scaled by 100)
    uint256 public constant MIN_CONFIDENCE = 50;        // Hard floor - reject below this
    
    // Config
    uint256 public constant MINT_DELAY = 1 hours;
    uint256 public constant VETO_THRESHOLD = 50000 * 1e18;

    struct MintRequest {
        uint256 amount;
        uint256 timestamp;
        uint256 linkedTaskId;  // The task that justifies this mint
        bool executed;
        bool vetoed;
    }

    MintRequest[] public requests;
    
    event MintRequested(uint256 indexed requestId, uint256 amount, uint256 taskId);
    event MintApproved(uint256 indexed requestId, address indexed aiAgent, uint256 scaledAmount);
    event MintVetoed(uint256 indexed requestId, string reason);

    constructor(address _engine, address _market) Ownable(msg.sender) {
        engine = StabilityEngine(payable(_engine));
        market = TaskMarket(_market);
    }

    // ============ User Actions ============

    /**
     * @notice Request a mint, linked to a completed task in the prediction market.
     * @param _amount Requested mint amount
     * @param _taskId The TaskMarket task ID that justifies this mint
     */
    function requestMint(uint256 _amount, uint256 _taskId) external onlyOwner {
        requests.push(MintRequest({
            amount: _amount,
            timestamp: block.timestamp,
            linkedTaskId: _taskId,
            executed: false,
            vetoed: false
        }));
        
        emit MintRequested(requests.length - 1, _amount, _taskId);
    }

    // ============ AI Agent Actions ============

    /**
     * @notice Approve a mint based on market confidence.
     * @dev The actual minted amount is scaled by the sigmoid function.
     * @param _requestId The request to approve
     */
    function approveMint(uint256 _requestId) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        require(!req.executed, "Already executed");
        require(!req.vetoed, "Vetoed");
        
        // Get market confidence for the linked task
        (uint256 yesPercent, ) = market.getOdds(req.linkedTaskId);
        
        // Hard floor check
        require(yesPercent >= MIN_CONFIDENCE, "Market confidence too low");
        
        // Calculate mint multiplier using sigmoid approximation
        uint256 multiplier = _sigmoid(yesPercent);
        
        // Scale the mint amount
        uint256 scaledAmount = (req.amount * multiplier) / 100;
        
        // Execute
        req.executed = true;
        engine.mint(scaledAmount);
        
        // Transfer to owner
        INateToken(address(engine.nateToken())).transfer(owner(), scaledAmount);

        emit MintApproved(_requestId, msg.sender, scaledAmount);
    }

    function vetoMint(uint256 _requestId, string calldata _reason) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        req.vetoed = true;
        emit MintVetoed(_requestId, _reason);
    }

    // ============ Nonlinear Math ============

    /**
     * @notice Approximates sigmoid function: 1 / (1 + e^(-k(x - threshold)))
     * @dev Uses polynomial approximation since Solidity has no exp().
     * Returns value 0-100 representing the multiplier percentage.
     * 
     * The approximation uses a piecewise linear + quadratic hybrid:
     *   - Below threshold: grows slowly (quadratic)
     *   - Above threshold: accelerates toward 100 (inverse quadratic)
     * 
     * This mimics the S-curve behavior of a true sigmoid.
     */
    function _sigmoid(uint256 confidence) internal pure returns (uint256) {
        if (confidence <= 50) {
            // Quadratic growth: (c/50)^2 * 25 -> gives 0-25 range for c 0-50
            return (confidence * confidence) / 100;
        } else if (confidence <= CONFIDENCE_THRESHOLD) {
            // Linear transition zone: 25 -> 50 as c goes 50 -> 70
            // Slope = 25 / 20 = 1.25 per percent
            return 25 + ((confidence - 50) * 125) / 100;
        } else if (confidence <= 90) {
            // Accelerating zone: 50 -> 90 as c goes 70 -> 90
            // Steeper climb
            return 50 + ((confidence - 70) * 200) / 100;
        } else {
            // Saturation zone: 90 -> 100 as c goes 90 -> 100
            // Slow approach to max
            return 90 + (confidence - 90);
        }
    }

    /**
     * @notice Get the current multiplier for a given confidence (for UI preview)
     */
    function getMultiplier(uint256 confidence) external pure returns (uint256) {
        return _sigmoid(confidence);
    }
}
