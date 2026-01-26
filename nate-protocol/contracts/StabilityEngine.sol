// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ILifeOracle.sol";

interface INateToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/**
 * @title StabilityEngine
 * @notice The "Central Bank" logic for $NATE.
 * @dev Manages the Collateral Ratio and authorizes minting based on Human + Liquid Capital.
 * Implements mechanism where supply expands with Human Value.
 */
contract StabilityEngine is Ownable, ReentrancyGuard {

    // ============ Constants ============
    
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant PRICE_PRECISION = 1e8;      // Chainlink decimals
    
    // ============ State Variables ============

    INateToken public nateToken;
    ILifeOracle public lifeOracle;
    
    // ETH Price Stub (For MVP - In prod, use Chainlink)
    // ETH Price Stub (Fixed for Phase 2 MVP - Gas Optimized)
    // @dev In production, this would be replaced by a Chainlink AggregatorV3Interface
    uint256 public constant ethPriceUSD = 2500 * 1e8; // $2500/ETH fixed
    
    // Treasury Tracking
    uint256 public totalLiquidETH;
    
    // Events
    event CollateralRatioUpdated(uint256 newRatio);
    event Minted(address indexed to, uint256 amount, uint256 newSupply);
    event Redeemed(address indexed user, uint256 amountNate, uint256 ethRefund);
    event TreasuryDeposit(address indexed from, uint256 amount);

    constructor(address _token, address _oracle) Ownable(msg.sender) {
        nateToken = INateToken(_token);
        lifeOracle = ILifeOracle(_oracle);
    }

    // ============ Core Stablecoin Mechanics ============

    /**
     * @dev "Human Quantitative Easing"
     * Mint new NATE tokens against the rising value of Nate's life metrics.
     * Only checks that we remain over-collateralized.
     */
    /**
     * @notice Mint NATE Tokens
     * @dev Mint new NATE tokens against the rising value of backing metrics.
     * Only checks that we remain over-collateralized.
     * @param _amount The amount of NATE to mint
     */
    function mint(uint256 _amount) external onlyOwner {
        uint256 totalSupply = nateToken.totalSupply();
        uint256 projectedSupply = totalSupply + _amount;
        
        uint256 totalValuationUSD = _calculateTotalValuationUSD();
        
        // Check CR: (TotalValue / Supply) >= 1.5
        // TotalValue >= Supply * 1.5
        require(
            totalValuationUSD >= (projectedSupply * MIN_COLLATERAL_RATIO) / 100, 
            "Undercollateralized mint attempt"
        );
        
        nateToken.mint(msg.sender, _amount);
        emit Minted(msg.sender, _amount, projectedSupply);
    }

    /**
     * @dev Redeem NATE for ETH at $1.00 Peg.
     * Burns NATE -> Sends equivalent ETH.
     */
    /**
     * @notice Redeem NATE for ETH at $1.00 Peg.
     * @dev Burns NATE -> Sends equivalent ETH.
     * @param _amountNate Amount of NATE to burn
     */
    function redeem(uint256 _amountNate) external nonReentrant {
        require(nateToken.balanceOf(msg.sender) >= _amountNate, "Insufficient funds");
        
        // 1. Calculate ETH Value
        // $1.00 USD per NATE.
        // ETH Amount = (NATE Amount * $1) / ETH Price
        // Decimals: (1e18 * 1e8) / 1e8 = 1e18
        uint256 ethToReturn = (_amountNate * PRICE_PRECISION) / ethPriceUSD;
        
        require(address(this).balance >= ethToReturn, "Treasury liquid crisis");
        
        // 2. Burn NATE
        nateToken.burn(msg.sender, _amountNate);
        
        // 3. Send ETH
        (bool success, ) = payable(msg.sender).call{value: ethToReturn}("");
        require(success, "ETH transfer failed");
        
        emit Redeemed(msg.sender, _amountNate, ethToReturn);
    }

    // ============ Valuation Logic ============

    function _calculateTotalValuationUSD() internal view returns (uint256) {
        // 1. Human Capital (Already in USD 1e18 from Oracle)
        uint256 humanCapital = lifeOracle.getTotalValue();
        
        // 2. Liquid Treasury (ETH Balance -> USD)
        uint256 liquidEthBalance = address(this).balance;
        uint256 liquidCapitalUSD = (liquidEthBalance * ethPriceUSD) / PRICE_PRECISION;
        
        return humanCapital + liquidCapitalUSD;
    }
    
    function getSystemStatus() external view returns (
        uint256 totalSupply,
        uint256 totalValueUSD,
        uint256 collateralRatio,
        uint256 liquidEth
    ) {
        totalSupply = nateToken.totalSupply();
        totalValueUSD = _calculateTotalValuationUSD();
        liquidEth = address(this).balance;
        
        if (totalSupply > 0) {
            collateralRatio = (totalValueUSD * 100) / totalSupply;
        } else {
            collateralRatio = type(uint256).max;
        }
    }

    // ============ Admin / Treasury ============

    receive() external payable {
        emit TreasuryDeposit(msg.sender, msg.value);
    }
    
    // @dev Removed setEthPrice for gas optimization (constant price)
    // function setEthPrice(uint256 _price) external onlyOwner {
    //     ethPriceUSD = _price;
    // }
    
    function setOracle(address _oracle) external onlyOwner {
        lifeOracle = ILifeOracle(_oracle);
    }
}
