// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title LifeOracleV2 (The Quantified Self)
 * @dev Fetches granular life metrics via Chainlink Functions to calculate
 * the Human Capital backing of $NATE.
 */
contract LifeOracleV2 is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ State Variables ============

    bytes32 public donID;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    string public sourceCode; // The JS calculation logic

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // The Tangible Metrics
    // The Tangible Metrics
    /// @dev Struct holding all quantified self data points
    struct QuantifiedSelf {
        uint256 totalValue;        // The final calculated monetary value (18 decimals)
        uint8 sleepScore;          // 0-100
        uint8 restingHeartRate;    // bpm
        uint8 deepWorkHours;       // hours
        uint16 gitHubCommitStreak; // days
        uint256 socialImpactScore; // aggregate score
        uint256 futureEarnings;    // projected contracts/revenue (USD 1e18)
        uint256 lastUpdate;
    }

    QuantifiedSelf public metrics;

    event MetricsRequests(bytes32 indexed requestId);
    event MetricsUpdated(QuantifiedSelf newMetrics);
    event RequestFailed(bytes error);

    // ============ Constructor ============

    constructor(address router, bytes32 _donId, uint64 _subscriptionId) 
        FunctionsClient(router) 
        ConfirmedOwner(msg.sender) 
    {
        donID = _donId;
        subscriptionId = _subscriptionId;
    }

    // ============ Configuration ============

    function setSourceCode(string calldata _source) external onlyOwner {
        sourceCode = _source;
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }
    
    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }

    // ============ Core Logic ============

    /**
     * @dev Sends a request to the Chainlink DON to fetch metrics.
     */
    function updateMetrics(string[] calldata args) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        if (args.length > 0) req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );

        emit MetricsRequests(s_lastRequestId);
        return s_lastRequestId;
    }

    /**
     * @dev Callback that updates the contract state
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            return; // Ignore invalid requests
        }

        s_lastResponse = response;
        s_lastError = err;

        if (response.length > 0) {
            // Decode the response
            // Expected encoding from JS: 
            // abi.encode(totalValue, sleep, rhr, work, streak, social, futureEarnings)
            (
                uint256 _totalValue,
                uint8 _sleep,
                uint8 _rhr,
                uint8 _work,
                uint16 _streak,
                uint256 _social,
                uint256 _futureEarnings
            ) = abi.decode(response, (uint256, uint8, uint8, uint8, uint16, uint256, uint256));

            // Sanity Check: Cap Future Earnings at $1B to prevent abuse
            require(_futureEarnings <= 1_000_000_000 * 1e18, "Unrealistic earnings");

            metrics = QuantifiedSelf({
                totalValue: _totalValue,
                sleepScore: _sleep,
                restingHeartRate: _rhr,
                deepWorkHours: _work,
                gitHubCommitStreak: _streak,
                socialImpactScore: _social,
                futureEarnings: _futureEarnings,
                lastUpdate: block.timestamp
            });

            emit MetricsUpdated(metrics);
        } else {
            emit RequestFailed(err);
        }
    }

    // ============ Interface Implementation ============

    // Compatibility with StabilityEngine
    function getTotalValue() external view returns (uint256) {
        return metrics.totalValue;
    }
}
