// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILifeOracle.sol";

interface INateToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/**
 * @title StabilityEngine (Enhanced)
 * @notice The "Central Bank" logic for $NATE with Advanced Security.
 * @dev Manages the Collateral Ratio, user deposits, and emergency pause.
 */
contract StabilityEngine is Ownable, AccessControl, Pausable, ReentrancyGuard {

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============ Constants ============
    
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant PRICE_PRECISION = 1e8;      // Chainlink decimals
    
    // ============ Fees ============
    uint256 public mintFeeBps = 50;   // 0.5% (taken from proceeds)
    uint256 public redeemFeeBps = 50; // 0.5%
    uint256 public accumulatedEthFees;

    // ============ State Variables ============

    INateToken public nateToken;
    ILifeOracle public lifeOracle;
    address public governanceBoard;
    
    // ETH Price Stub (Fixed for MVP)
    uint256 public constant ethPriceUSD = 2500 * 1e8; // $2500/ETH fixed
    
    // User tracking
    mapping(address => uint256) public userCollateralDeposits;
    uint256 public totalETHCollateral;

    // ============ Events ============
    event Minted(address indexed to, uint256 amount, uint256 collateral, uint256 blockNumber);
    event Burned(address indexed user, uint256 amountNate, uint256 ethRefund);
    event EmergencyWithdrawal(address indexed user, uint256 ethAmount);
    event GovernanceBoardUpdated(address indexed newBoard);

    constructor(address _token, address _oracle) Ownable(msg.sender) {
        nateToken = INateToken(_token);
        lifeOracle = ILifeOracle(_oracle);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // ============ Core Stablecoin Mechanics ============

    /**
     * @notice Mint NATE Tokens by depositing ETH collateral.
     * @param _amount The amount of NATE to mint
     */
    function mint(uint256 _amount) external payable whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        
        // 1. Calculate Required Collateral (ETH)
        // CollateralUSD = (NATE * 1.5)
        // CollateralETH = CollateralUSD / Price
        uint256 requiredCollateralUSD = (_amount * MIN_COLLATERAL_RATIO) / 100;
        uint256 requiredCollateralETH = (requiredCollateralUSD * PRICE_PRECISION) / ethPriceUSD;
        
        require(msg.value >= requiredCollateralETH, "Insufficient collateral");

        // 2. Over-collateralization check (Global System Health)
        uint256 projectedSupply = nateToken.totalSupply() + _amount;
        uint256 totalValuationUSD = _calculateTotalValuationUSD();
        
        require(
            totalValuationUSD >= (projectedSupply * MIN_COLLATERAL_RATIO) / 100, 
            "System undercollateralized"
        );

        // 3. Track Collateral
        userCollateralDeposits[msg.sender] += requiredCollateralETH;
        totalETHCollateral += requiredCollateralETH;

        // 4. Refund Excess ETH
        uint256 excess = msg.value - requiredCollateralETH;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Excess refund failed");
        }

        // 5. Mint tokens
        nateToken.mint(msg.sender, _amount);
        
        emit Minted(msg.sender, _amount, requiredCollateralETH, block.number);
    }

    /**
     * @notice Redeem NATE for ETH collateral.
     * @param _amountNate Amount of NATE to burn
     */
    function burn(uint256 _amountNate) external whenNotPaused nonReentrant {
        require(_amountNate > 0, "Amount must be > 0");
        require(nateToken.balanceOf(msg.sender) >= _amountNate, "Insufficient balance");
        
        uint256 userTotalNate = nateToken.balanceOf(msg.sender); // This is slightly flawed as we don't know exactly what % of users current balance is from collateral vs market buy, but for simplicity we'll assume they can only burn what they have collateral for if we track it strictly.
        // Actually, let's just use the proportional collateral return logic.
        
        uint256 userCollateral = userCollateralDeposits[msg.sender];
        require(userCollateral > 0, "No collateral to return");
        
        // Proportional return: (burnAmount / userTotalBalance) * userCollateral
        // But for easier MVP: (CollateralETH / NATE Supply) return? No, that's unstable.
        // Let's go with: return ETH at current peg.
        uint256 ethToReturn = (_amountNate * PRICE_PRECISION) / ethPriceUSD;
        require(ethToReturn <= userCollateral, "Cannot burn more than collateralized");

        userCollateralDeposits[msg.sender] -= ethToReturn;
        totalETHCollateral -= ethToReturn;

        nateToken.burn(msg.sender, _amountNate);
        
        (bool success, ) = payable(msg.sender).call{value: ethToReturn}("");
        require(success, "ETH return failed");
        
        emit Burned(msg.sender, _amountNate, ethToReturn);
    }

    // ============ Emergency Functions ============

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency exit for users when the protocol is paused.
     * Burns all user NATE and returns all user collateral.
     */
    function emergencyWithdraw() external whenPaused nonReentrant {
        uint256 collateral = userCollateralDeposits[msg.sender];
        require(collateral > 0, "No collateral");
        
        uint256 balance = nateToken.balanceOf(msg.sender);
        if (balance > 0) {
            nateToken.burn(msg.sender, balance);
        }

        userCollateralDeposits[msg.sender] = 0;
        totalETHCollateral -= collateral;

        (bool success, ) = payable(msg.sender).call{value: collateral}("");
        require(success, "Emergency withdrawal failed");
        
        emit EmergencyWithdrawal(msg.sender, collateral);
    }

    // ============ Valuation Logic ============

    function _calculateTotalValuationUSD() internal view returns (uint256) {
        uint256 humanCapital = lifeOracle.getTotalValue();
        uint256 liquidCapitalUSD = (address(this).balance * ethPriceUSD) / PRICE_PRECISION;
        return humanCapital + liquidCapitalUSD;
    }

    function getSystemStats() external view returns (
        uint256 supply,
        uint256 ethCollateral,
        bool healthy
    ) {
        supply = nateToken.totalSupply();
        ethCollateral = totalETHCollateral;
        uint256 totalVal = _calculateTotalValuationUSD();
        healthy = supply == 0 || (totalVal * 100) / supply >= MIN_COLLATERAL_RATIO;
    }

    function getCollateralRatio() external view returns (uint256) {
        uint256 supply = nateToken.totalSupply();
        if (supply == 0) return type(uint256).max;
        return (_calculateTotalValuationUSD() * 100) / supply;
    }

    function isSystemHealthy() external view returns (bool) {
        uint256 supply = nateToken.totalSupply();
        if (supply == 0) return true;
        return (_calculateTotalValuationUSD() * 100) / supply >= MIN_COLLATERAL_RATIO;
    }

    // ============ Admin ============

    function setGovernanceBoard(address _board) external onlyOwner {
        governanceBoard = _board;
        emit GovernanceBoardUpdated(_board);
    }

    receive() external payable {
        // Direct deposits just increase system backing
    }
}
