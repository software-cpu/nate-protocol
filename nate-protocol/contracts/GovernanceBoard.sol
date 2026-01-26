// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./StabilityEngine.sol";
import "./TaskMarket.sol";

/**
 * @title GovernanceBoard (Phase 7: Nonlinear Adaptive Control)
 * @notice The "Algo-Board" utilizing Advanced Control Theory.
 * @dev Implements an Adaptive PID Controller with Exponential Decay Memory.
 * 
 * ## System Dynamics
 * The control law is governed by the following nonlinear differential equation:
 * 
 *   u(t) = Kp⋅e(t) + Ki⋅∫[e(τ)⋅e^(-λ(t-τ))]dτ + Kd(σ)⋅(de/dt)
 * 
 * Key Innovations:
 * 1. **Leaky Integrator (Memory)**: The integral term decays exponentially (λ), 
 *    simulating organic memory loss rather than arbitrary hard caps.
 * 2. **Adaptive Damping**: The Kd gain is not static; it scales with market volatility 
 *    (σ = |de/dt|). High volatility triggers stronger braking.
 */
contract GovernanceBoard is Ownable {

    StabilityEngine public engine;
    TaskMarket public market;
    
    // === Adaptive Parameters ===
    int256 public constant PRECISION = 10000;
    
    // Base Gains (Normalized)
    int256 public base_Kp = 200; 
    int256 public base_Ki = 15;
    int256 public base_Kd = 400;
    
    // Nonlinear Factors
    int256 public memory_decay = 9500; // λ = 0.95 per step (Exponential Decay)
    int256 public nonlinearity_factor = 200; // Scaling for adaptive damping

    // === System State ===
    int256 public targetConfidence = 90;
    int256 public integralState; // Accumulator
    int256 public prevError;
    
    // Config
    uint256 public constant MINT_DELAY = 1 hours;

    struct MintRequest {
        uint256 amount;
        uint256 timestamp;
        uint256 linkedTaskId;
        bool executed;
        bool vetoed;
    }

    MintRequest[] public requests;
    
    event PIDUpdate(int256 error, int256 p, int256 i, int256 d, uint256 adjustment);
    event MintApproved(uint256 indexed requestId, address indexed aiAgent, uint256 scaledAmount);
    event MintVetoed(uint256 indexed requestId, string reason);

    constructor(address _engine, address _market) Ownable(msg.sender) {
        engine = StabilityEngine(payable(_engine));
        market = TaskMarket(_market);
    }

    // ============ Admin Tuning ============
    
    function setSystemParams(int256 _kp, int256 _ki, int256 _kd, int256 _decay) external onlyOwner {
        base_Kp = _kp;
        base_Ki = _ki;
        base_Kd = _kd;
        memory_decay = _decay;
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
    }

    // ============ Control Loop ============

    /**
     * @notice Execute the Nonlinear Control Law
     */
    function approveMint(uint256 _requestId) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        require(!req.executed, "Executed");
        require(!req.vetoed, "Vetoed");
        
        console.log("ApproveMint Request:", _requestId);
        
        // 1. Comparison Unit (Error Calculation)
        (uint256 yesPercent, ) = market.getOdds(req.linkedTaskId);
        console.log("YesPercent:", yesPercent);
        
        int256 confidence = int256(yesPercent);
        int256 error = confidence - targetConfidence;
        
        // 2. Proportional Term (Linear Response)
        // P = Kp * e(t)
        int256 P = (base_Kp * error) / 100;
        
        // 3. Integral Term (Leaky Integrator / Exponential Decay)
        // I(t) = (I(t-1) * λ) + e(t)
        // This removes the need for arbitrary clamping. History fades naturally.
        integralState = (integralState * memory_decay) / PRECISION + error;
        int256 I = (base_Ki * integralState) / 100;
        
        // 4. Derivative Term (Adaptive Damping)
        // de/dt = current_error - prev_error
        int256 derivative = error - prevError;
        
        // Nonlinear Gain Scheduling:
        // Kd_effective = Kd_base * (1 + |derivative| * scaling)
        // If derivative is high (crash), gain increases to apply brakes harder.
        int256 volatility = derivative >= 0 ? derivative : -derivative;
        int256 adaptive_gain = base_Kd + (volatility * volatility * nonlinearity_factor) / 100;
        
        int256 D = (adaptive_gain * derivative) / 100;
        
        prevError = error;
        
        // 5. Control Output
        // u(t) = P + I + D
        int256 adjustment = P + I + D;
        
        // Map output to Mint Multiplier (Baseline 100%)
        int256 finalPercent = 100 + adjustment;
        
        // Physical Limits (Saturation)
        if (finalPercent < 0) finalPercent = 0;
        if (finalPercent > 200) finalPercent = 200; // Allow 2x boost if stellar
        
        emit PIDUpdate(error, P, I, D, uint256(finalPercent));
        
        // 6. Actuator
        uint256 scaledAmount = (req.amount * uint256(finalPercent)) / 100;
        
        if (scaledAmount > 0) {
            req.executed = true;
            engine.mint(scaledAmount);
            INateToken(address(engine.nateToken())).transfer(owner(), scaledAmount);
            emit MintApproved(_requestId, msg.sender, scaledAmount);
        } else {
             req.vetoed = true; // Signal rejection by controller
             emit MintVetoed(_requestId, "Control Loop Output <= 0%");
        }
    }

    function vetoMint(uint256 _requestId, string calldata _reason) external onlyOwner {
        MintRequest storage req = requests[_requestId];
        req.vetoed = true;
        emit MintVetoed(_requestId, _reason);
    }
}
