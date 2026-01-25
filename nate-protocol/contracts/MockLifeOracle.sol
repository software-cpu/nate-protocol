// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ILifeOracle.sol";

contract MockLifeOracle is ILifeOracle {
    LifeMetrics public metrics;
    uint256 public totalValueOverride;

    function setMetrics(
        uint256 _time,
        uint256 _skill,
        uint256 _network,
        uint256 _earnings
    ) external {
        metrics = LifeMetrics({
            timeValue: _time,
            skillValue: _skill,
            networkValue: _network,
            futureEarnings: _earnings,
            verificationScore: 100,
            lastUpdate: block.timestamp
        });
        totalValueOverride = _time + _skill + _network + _earnings;
    }

    function getMetrics() external view returns (LifeMetrics memory) {
        return metrics;
    }

    function getTotalValue() external view returns (uint256) {
        return totalValueOverride;
    }
}
