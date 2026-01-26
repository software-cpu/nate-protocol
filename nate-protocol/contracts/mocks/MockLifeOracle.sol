// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ILifeOracle.sol";

contract MockLifeOracle is ILifeOracle {
    uint256 public totalValue;

    function setTotalValue(uint256 _value) external {
        totalValue = _value;
    }

    function getTotalValue() external view override returns (uint256) {
        return totalValue;
    }
    
    function getMetrics() external pure override returns (LifeMetrics memory) {
        return LifeMetrics({
            timeValue: 0,
            skillValue: 0,
            networkValue: 0,
            futureEarnings: 0,
            verificationScore: 0,
            lastUpdate: 0
        });
    }
}
