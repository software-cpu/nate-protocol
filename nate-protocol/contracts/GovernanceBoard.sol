// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StabilityEngine.sol";
import "./TaskMarket.sol";

/**
 * @title GovernanceBoard (Phase 6: PID Control)
 * @notice The "Algo-Board" that governs the Stability Engine using Control Theory.
 * @dev Implements a Proportional-Integral-Derivative (PID) Controller to stabilize Trust.
 * 
 * ## Differential Equation
 * u(t) = Kp * e(t) + Ki * ∫e(t)dt + Kd * de(t)/dt
 * 
 * Where e(t) = Market Confidence - Target (90%)
 */
contract GovernanceBoard is Ownable {

    StabilityEngine public engine;
    TaskMarket public market;
    
    // === PID Parameters (Scaled by 100) ===
    int256 public K_p = 200;  // Proportional Gain (Response Strength)
    int256 public K_i = 10;   // Integral Gain (Memory / Consistency Reward)
    int256 public K_d = 500;  // Derivative Gain (Damping / Crash Prevention)
    
    // === Control State ===
    int256 public targetConfidence = 90; // We want 90% confidence always
    int256 public integralError;         // Accumulated error over time
    int256 public prevError;             // Error from last check
    
    // Config
    uint256 public constant MINT_DELAY = 1 hours;
    uint256 public constant VETO_THRESHOLD = 50000 * 1e18;

    struct MintRequest {
        uint256 amount;
        uint256 timestamp;
        uint256 linkedTaskId;
        bool executed;
        bool vetoed;
    }

    MintRequest[] public requests;
    
    event MintRequested(uint256 indexed requestId, uint256 amount, uint256 taskId);
    event MintApproved(uint256 indexed requestId, address indexed aiAgent, uint256 scaledAmount);
    event MintVetoed(uint256 indexed requestId, string reason);
    event PIDUpdate(int256 error, int256 p, int256 i, int256 d, uint256 adjustment);

    constructor(address _engine, address _market) Ownable(msg.sender) {
        engine = StabilityEngine(payable(_engine));
        market = TaskMarket(_market);
    }

    // ============ Admin Tuning ============
    
    function setPIDGains(int256 _kp, int256 _ki, int256 _kd) external onlyOwner {
        K_p = _kp;
        K_i = _ki;
        K_d = _kd;
    }

    // ============ User Actions ============

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
     * @notice Approve a mint using PID Control Logic.
     * @dev Calculates error terms and adjusts the mint amount dynamically.
     */
    function approveMint(uint256 _requestId) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        require(!req.executed, "Already executed");
        require(!req.vetoed, "Vetoed");
        
        // 1. Get Feedback (Market Confidence)
        (uint256 yesPercent, ) = market.getOdds(req.linkedTaskId);
        int256 currentConfidence = int256(yesPercent);
        
        // 2. Calculate Error
        int256 error = currentConfidence - targetConfidence;
        
        // 3. PID Calcs
        // Proportional
        int256 P = (K_p * error) / 100;
        
        // Integral (Accumulate error, capped to prevent windup)
        integralError += error;
        // Clamp integral to +/- 1000 to prevent runaway
        if (integralError > 1000) integralError = 1000;
        if (integralError < -1000) integralError = -1000;
        
        int256 I = (K_i * integralError) / 100;
        
        // Derivative
        int256 derivative = error - prevError;
        int256 D = (K_d * derivative) / 100;
        
        prevError = error;
        
        // 4. Calculate Control Output (Adjustment Factor)
        // Baseline is 100% (if error is 0). 
        // Example: If output is -20, we mint 80%. If output is +10, we mint 110% (bonus).
        int256 adjustment = P + I + D;
        int256 finalPercent = 100 + adjustment;
        
        // Clamp result (0% to 150%)
        if (finalPercent < 0) finalPercent = 0;
        if (finalPercent > 150) finalPercent = 150;
        
        emit PIDUpdate(error, P, I, D, uint256(finalPercent));
        
        // 5. Execute
        uint256 scaledAmount = (req.amount * uint256(finalPercent)) / 100;
        
        if (scaledAmount > 0) {
            req.executed = true;
            engine.mint(scaledAmount);
            INateToken(address(engine.nateToken())).transfer(owner(), scaledAmount);
            emit MintApproved(_requestId, msg.sender, scaledAmount);
        } else {
            // Effectively vetoed by math
             emit MintVetoed(_requestId, "PID Controller rejected mint (0%)");
             req.vetoed = true; // Mark as processed but rejected
        }
    }

    function vetoMint(uint256 _requestId, string calldata _reason) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        req.vetoed = true;
        emit MintVetoed(_requestId, _reason);
    }
}
