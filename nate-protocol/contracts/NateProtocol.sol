// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NateProtocol ($NATE)
 * @dev Reconciled Framework: A Growth Token with a Hard Value Floor.
 * 
 * CORE MECHANICS:
 * 1. Fixed Supply (No inflation, deflationary via buybacks).
 * 2. Opportunity Registry (FW1: Logging potential).
 * 3. Revenue Router (FW1: "Anti-Extraction").
 * 4. NAV Oracle (FW2: Life Metrics as value floor).
 * 5. Dead Man's Switch (FW1: Crisis Intervention).
 */
contract NateProtocol is ERC20, Ownable, ReentrancyGuard {

    // ============ Constants ============
    
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 1e18;
    uint256 public constant CRISIS_TIMEOUT = 30 days;
    
    // Revenue split percentages (basis points, 10000 = 100%)
    uint256 public constant BUYBACK_BPS = 2000;   // 20%
    uint256 public constant TREASURY_BPS = 3000;  // 30%
    // Remaining 50% goes to operator

    // ============ State Variables ============

    uint256 public totalTreasuryValue;
    uint256 public totalBurnedFromBuybacks;
    
    // Human Capital Valuation
    struct LifeMetrics {
        uint256 timeValue;
        uint256 skillValue;
        uint256 networkValue;
        uint256 futureEarnings;
        uint256 lastUpdate;
    }
    LifeMetrics public currentMetrics;
    
    // Opportunity Registry
    enum OpportunityStatus { Active, Claimed, Executed, Expired }
    
    struct Opportunity {
        uint256 id;
        string description;
        string category;        // JOB, IDEA, CONNECTION, SKILL, INSIGHT
        uint256 estimatedValue;
        OpportunityStatus status;
        address executor;
        uint256 createdAt;
        uint256 claimedAt;
    }
    
    uint256 public opportunityCount;
    mapping(uint256 => Opportunity) public opportunities;
    mapping(address => uint256[]) public executorOpportunities;
    
    // Crisis / Dead Man's Switch
    uint256 public lastActiveTimestamp;
    bool public crisisModeActive;
    address public communityCouncil;
    
    // Staking for governance weight
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakeTimestamp;
    uint256 public totalStaked;

    // ============ Events ============

    event OpportunityLogged(
        uint256 indexed id, 
        string category,
        string description, 
        uint256 estimatedValue
    );
    event OpportunityClaimed(uint256 indexed id, address indexed executor);
    event OpportunityExecuted(uint256 indexed id, uint256 actualValue);
    event RevenueDistributed(
        uint256 totalAmount, 
        uint256 buybackAmount, 
        uint256 treasuryAmount,
        uint256 operatorAmount
    );
    event MetricsUpdated(uint256 totalValuation, uint256 navPerToken);
    event BuybackExecuted(uint256 nateBurned, uint256 ethSpent);
    event CrisisModeActivated(address indexed initiator);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event TreasuryWithdrawal(address indexed to, uint256 amount, string reason);

    // ============ Modifiers ============

    modifier onlyCouncil() {
        require(msg.sender == communityCouncil, "Not council");
        _;
    }
    
    modifier notInCrisis() {
        require(!crisisModeActive, "Crisis mode active");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _council, 
        address _treasuryReserve
    ) ERC20("Nate Execution Protocol", "NATE") Ownable(msg.sender) {
        require(_council != address(0), "Invalid council");
        require(_treasuryReserve != address(0), "Invalid treasury");
        
        communityCouncil = _council;
        lastActiveTimestamp = block.timestamp;

        // Distribution per FW1: 50% Community, 30% Nate, 20% Reserve
        _mint(msg.sender, (INITIAL_SUPPLY * 30) / 100);           // Nate: 3M
        _mint(_treasuryReserve, (INITIAL_SUPPLY * 20) / 100);     // Reserve: 2M
        _mint(address(this), (INITIAL_SUPPLY * 50) / 100);        // Community sale/LP: 5M
    }

    // ============ Opportunity Registry (FW1 Core) ============

    /**
     * @dev Log a new opportunity. Implements "First Right of Refusal"
     */
    function logOpportunity(
        string calldata _category,
        string calldata _description, 
        uint256 _estimatedValue
    ) external onlyOwner notInCrisis {
        _heartbeat();
        
        opportunityCount++;
        opportunities[opportunityCount] = Opportunity({
            id: opportunityCount,
            description: _description,
            category: _category,
            estimatedValue: _estimatedValue,
            status: OpportunityStatus.Active,
            executor: address(0),
            createdAt: block.timestamp,
            claimedAt: 0
        });
        
        emit OpportunityLogged(opportunityCount, _category, _description, _estimatedValue);
    }
    
    /**
     * @dev Token holders can claim opportunities they want to execute
     */
    function claimOpportunity(uint256 _id) external nonReentrant {
        require(balanceOf(msg.sender) > 0 || stakedBalance[msg.sender] > 0, "Must hold NATE");
        
        Opportunity storage opp = opportunities[_id];
        require(opp.id != 0, "Opportunity not found");
        require(opp.status == OpportunityStatus.Active, "Not available");
        
        opp.status = OpportunityStatus.Claimed;
        opp.executor = msg.sender;
        opp.claimedAt = block.timestamp;
        
        executorOpportunities[msg.sender].push(_id);
        
        emit OpportunityClaimed(_id, msg.sender);
    }
    
    /**
     * @dev Mark opportunity as executed (called when revenue flows in)
     */
    function markExecuted(uint256 _id, uint256 _actualValue) external onlyOwner {
        Opportunity storage opp = opportunities[_id];
        require(opp.status == OpportunityStatus.Claimed, "Not claimed");
        
        opp.status = OpportunityStatus.Executed;
        emit OpportunityExecuted(_id, _actualValue);
    }

    // ============ Revenue Distribution (Anti-Extraction) ============

    /**
     * @dev Receive ETH and distribute per FW1 mandate
     */
    receive() external payable {
        if (msg.value > 0) {
            _distributeRevenue(msg.value);
        }
    }
    
    function distributeRevenue() external payable nonReentrant {
        require(msg.value > 0, "No value sent");
        _distributeRevenue(msg.value);
    }

    function _distributeRevenue(uint256 amount) internal {
        // Calculate splits
        uint256 buybackShare = (amount * BUYBACK_BPS) / 10000;
        uint256 treasuryShare = (amount * TREASURY_BPS) / 10000;
        uint256 operatorShare = amount - buybackShare - treasuryShare;

        // Update treasury tracking
        totalTreasuryValue += treasuryShare;
        
        // Buyback share stays in contract for executeBuyback()
        // In production: auto-swap via Uniswap

        // Send operator share
        if (operatorShare > 0) {
            (bool success, ) = payable(owner()).call{value: operatorShare}("");
            require(success, "Operator transfer failed");
        }

        emit RevenueDistributed(amount, buybackShare, treasuryShare, operatorShare);
    }
    
    /**
     * @dev Execute buyback - burns NATE from the market
     * In production: integrate with Uniswap router
     * For prototype: manual burn simulation
     */
    function executeBuyback(uint256 _nateAmount) external onlyOwner {
        require(balanceOf(address(this)) >= _nateAmount, "Insufficient NATE");
        
        _burn(address(this), _nateAmount);
        totalBurnedFromBuybacks += _nateAmount;
        
        // Calculate ETH equivalent (simplified)
        uint256 ethEquivalent = (_nateAmount * address(this).balance) / balanceOf(address(this));
        
        emit BuybackExecuted(_nateAmount, ethEquivalent);
    }

    // ============ NAV & Life Metrics (FW2 Adapted) ============

    /**
     * @dev Update human capital metrics - establishes NAV floor
     */
    function updateLifeMetrics(
        uint256 _timeValue,
        uint256 _skillValue, 
        uint256 _networkValue,
        uint256 _futureEarnings
    ) external onlyOwner {
        _heartbeat();
        
        currentMetrics = LifeMetrics({
            timeValue: _timeValue,
            skillValue: _skillValue,
            networkValue: _networkValue,
            futureEarnings: _futureEarnings,
            lastUpdate: block.timestamp
        });
        
        uint256 nav = calculateNAV();
        emit MetricsUpdated(getTotalBacking(), nav);
    }
    
    /**
     * @dev Calculate Net Asset Value per token
     */
    function calculateNAV() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        
        return (getTotalBacking() * 1e18) / supply;
    }
    
    /**
     * @dev Total backing = Treasury + Human Capital
     */
    function getTotalBacking() public view returns (uint256) {
        return totalTreasuryValue + 
               currentMetrics.timeValue + 
               currentMetrics.skillValue + 
               currentMetrics.networkValue +
               currentMetrics.futureEarnings;
    }

    // ============ Staking (Governance Weight) ============

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), _amount);
        
        stakedBalance[msg.sender] += _amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }
    
    function unstake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot unstake 0");
        require(stakedBalance[msg.sender] >= _amount, "Insufficient staked");
        
        stakedBalance[msg.sender] -= _amount;
        totalStaked -= _amount;
        
        _transfer(address(this), msg.sender, _amount);
        
        emit Unstaked(msg.sender, _amount);
    }
    
    /**
     * @dev Governance weight = staked balance * time multiplier
     */
    function getVotingPower(address _user) external view returns (uint256) {
        uint256 staked = stakedBalance[_user];
        if (staked == 0) return 0;
        
        uint256 stakeDuration = block.timestamp - stakeTimestamp[_user];
        uint256 timeMultiplier = 100 + (stakeDuration / 30 days) * 10; // +10% per month, capped
        if (timeMultiplier > 200) timeMultiplier = 200; // Max 2x
        
        return (staked * timeMultiplier) / 100;
    }

    // ============ Dead Man's Switch (Crisis Intervention) ============

    function _heartbeat() internal {
        lastActiveTimestamp = block.timestamp;
    }

    /**
     * @dev If Nate goes dark, community takes over
     */
    function activateCrisisMode() external onlyCouncil {
        require(!crisisModeActive, "Already in crisis");
        require(
            block.timestamp > lastActiveTimestamp + CRISIS_TIMEOUT,
            "Nate is still active"
        );
        
        crisisModeActive = true;
        _transferOwnership(communityCouncil);
        
        emit CrisisModeActivated(msg.sender);
    }
    
    /**
     * @dev Nate can prove liveness to prevent crisis activation
     */
    function proveLiveness() external onlyOwner {
        _heartbeat();
    }

    // ============ Admin Functions ============

    function setCouncil(address _newCouncil) external onlyOwner {
        require(_newCouncil != address(0), "Invalid address");
        communityCouncil = _newCouncil;
    }
    
    /**
     * @dev Withdraw from treasury (requires justification)
     */
    function withdrawTreasury(
        address _to, 
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner {
        require(_amount <= totalTreasuryValue, "Exceeds treasury");
        require(address(this).balance >= _amount, "Insufficient ETH");
        
        totalTreasuryValue -= _amount;
        
        (bool success, ) = payable(_to).call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit TreasuryWithdrawal(_to, _amount, _reason);
    }
    
    /**
     * @dev Release community tokens (for sales, airdrops, LP)
     */
    function releaseCommunityTokens(address _to, uint256 _amount) external onlyOwner {
        require(balanceOf(address(this)) >= _amount, "Insufficient community pool");
        _transfer(address(this), _to, _amount);
    }

    // ============ View Functions ============

    function getOpportunity(uint256 _id) external view returns (Opportunity memory) {
        return opportunities[_id];
    }
    
    function getActiveOpportunities() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= opportunityCount; i++) {
            if (opportunities[i].status == OpportunityStatus.Active) {
                activeCount++;
            }
        }
        
        uint256[] memory active = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= opportunityCount; i++) {
            if (opportunities[i].status == OpportunityStatus.Active) {
                active[index] = i;
                index++;
            }
        }
        return active;
    }
    
    function getSystemStats() external view returns (
        uint256 supply,
        uint256 treasury,
        uint256 backing,
        uint256 nav,
        uint256 burned,
        uint256 staked,
        uint256 opportunities_,
        bool crisis
    ) {
        return (
            totalSupply(),
            totalTreasuryValue,
            getTotalBacking(),
            calculateNAV(),
            totalBurnedFromBuybacks,
            totalStaked,
            opportunityCount,
            crisisModeActive
        );
    }
    
    function timeToCrisis() external view returns (uint256) {
        uint256 deadline = lastActiveTimestamp + CRISIS_TIMEOUT;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
}
