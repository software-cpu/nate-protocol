// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILifeOracle.sol";

/**
 * @title LifeOracle
 * @dev The official Oracle for Nate's Life Metrics.
 * Currently uses a "Trusted Reporter" model (Phase 1).
 * In Phase 2, this will be upgraded to verify Chainlink Function signatures.
 */
contract LifeOracle is ILifeOracle, Ownable {
    
    // ============ State Variables ============

    LifeMetrics public metrics;
    
    // Weighted components to calculate Total Value (for transparency)
    // currently simple addition, but structure allows for future weights
    
    event MetricsUpdated(
        uint256 totalValue, 
        uint256 timeVal, 
        uint256 skillVal, 
        uint256 networkVal, 
        uint256 earningsVal
    );

    constructor() Ownable(msg.sender) {}

    // ============ Admin Functions ============

    /**
     * @dev Update metrics. Restricted to Owner (Nate) or Automated Backend.
     */
    function updateMetrics(
        uint256 _timeValue,
        uint256 _skillValue,
        uint256 _networkValue,
        uint256 _futureEarnings,
        uint256 _verificationScore
    ) external onlyOwner {
        metrics = LifeMetrics({
            timeValue: _timeValue,
            skillValue: _skillValue,
            networkValue: _networkValue,
            futureEarnings: _futureEarnings,
            verificationScore: _verificationScore,
            lastUpdate: block.timestamp
        });
        
        emit MetricsUpdated(
            getTotalValue(), 
            _timeValue, 
            _skillValue, 
            _networkValue, 
            _futureEarnings
        );
    }

    // ============ View Functions ============

    function getMetrics() external view returns (LifeMetrics memory) {
        return metrics;
    }

    function getTotalValue() public view returns (uint256) {
        // Simple aggregation for MVP. 
        // Logic: The "Value" backing the currency is the sum of these assets.
        return metrics.timeValue + 
               metrics.skillValue + 
               metrics.networkValue + 
               metrics.futureEarnings;
    }
}
