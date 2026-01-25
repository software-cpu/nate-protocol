// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILifeOracle {
    struct LifeMetrics {
        uint256 timeValue;       // Value of future time commitments
        uint256 skillValue;      // Value of verified skills/IP
        uint256 networkValue;    // Value of social graph
        uint256 futureEarnings;  // Projected future income (DCF)
        uint256 verificationScore; // 0-100 Confidence score
        uint256 lastUpdate;
    }

    function getMetrics() external view returns (LifeMetrics memory);
    function getTotalValue() external view returns (uint256);
}
