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
    
    // ============ Fees ============
    uint256 public mintFeeBps = 50;   // 0.5%
    uint256 public redeemFeeBps = 50; // 0.5%
    uint256 public accumulatedEthFees;

    // ============ State Variables ============

    INateToken public nateToken;
    ILifeOracle public lifeOracle;
    
    // ETH Price Stub (Fixed for MVP - In production, use Chainlink AggregatorV3Interface)
    uint256 public constant ethPriceUSD = 2500 * 1e8; // $2500/ETH fixed
    

    
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
        
        uint256 fee = (_amount * mintFeeBps) / 10000;
        uint256 netAmount = _amount - fee;

        nateToken.mint(msg.sender, netAmount);
        if (fee > 0) {
            nateToken.mint(address(this), fee); // Protocol revenue
        }
        
        emit Minted(msg.sender, _amount, projectedSupply);
    }

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
        
        uint256 fee = (ethToReturn * redeemFeeBps) / 10000;
        uint256 netEth = ethToReturn - fee;
        accumulatedEthFees += fee;

        require(address(this).balance >= ethToReturn, "Treasury liquid crisis");
        
        // 2. Burn NATE
        nateToken.burn(msg.sender, _amountNate);
        
        // 3. Send ETH
        (bool success, ) = payable(msg.sender).call{value: netEth}("");
        require(success, "ETH transfer failed");
        
        emit Redeemed(msg.sender, _amountNate, netEth);
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

    /**
     * @notice Purchase $NATE directly with ETH.
     * @dev 95% of ETH goes to owner, 5% stays in treasury for liquidity.
     * Mints $NATE to the buyer at $1.00 peg.
     */
    function purchase() external payable nonReentrant {
        require(msg.value > 0, "Zero value");
        
        // 1. Calculate NATE amount
        // NATE = (ETH * Price) / Precision
        uint256 nateToMint = (msg.value * ethPriceUSD) / PRICE_PRECISION;
        
        // 2. Check Over-collateralization
        uint256 projectedSupply = nateToken.totalSupply() + nateToMint;
        uint256 totalValuationUSD = _calculateTotalValuationUSD();
        
        require(
            totalValuationUSD >= (projectedSupply * MIN_COLLATERAL_RATIO) / 100, 
            "Purchase would undercollateralize system"
        );

        // 3. Forward proceeds (95%) to owner
        uint256 proceeds = (msg.value * 9500) / 10000;
        (bool success, ) = payable(owner()).call{value: proceeds}("");
        require(success, "Proceeds transfer failed");

        // 4. Mint tokens to buyer
        nateToken.mint(msg.sender, nateToMint);
        
        emit Minted(msg.sender, nateToMint, projectedSupply);
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

    function setFees(uint256 _mintFeeBps, uint256 _redeemFeeBps) external onlyOwner {
        require(_mintFeeBps <= 1000 && _redeemFeeBps <= 1000, "Max fee 10%");
        mintFeeBps = _mintFeeBps;
        redeemFeeBps = _redeemFeeBps;
    }

    function withdrawEthFees(address _to) external onlyOwner {
        uint256 amount = accumulatedEthFees;
        require(amount > 0, "No fees");
        accumulatedEthFees = 0;
        (bool success, ) = payable(_to).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function withdrawNateFees(address _to) external onlyOwner {
        uint256 balance = nateToken.balanceOf(address(this));
        require(balance > 0, "No NATE fees");
        nateToken.transfer(_to, balance);
    }
}
