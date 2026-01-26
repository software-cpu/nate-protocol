// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NateProtocol ($NATE)
 * @dev The Currency of Nate.
 * - Elastic Supply (Minting controlled by StabilityEngine)
 * - 1:1 Peg Target (Soft-pegged to $1 via Life Metrics + Liquid Reserves)
 * - Opportunity Registry & Governance Staking retained.
 */
contract NateProtocol is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ State Variables ============

    address public stabilityEngine; // Replaces 'treasuryReserve'

    // Opportunity Registry
    enum OpportunityStatus { Active, Claimed, Executed, Expired }
    
    struct Opportunity {
        uint256 id;
        string description;
        string category;
        uint256 estimatedValue; // USD value (18 decimals)
        OpportunityStatus status;
        address executor;
        uint256 createdAt;
        uint256 claimedAt;
    }
    
    uint256 public opportunityCount;
    mapping(uint256 => Opportunity) public opportunities;
    mapping(address => uint256[]) public executorOpportunities;
    
    // Staking for governance
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakeTimestamp;
    uint256 public totalStaked;

    // ============ Events ============

    event OpportunityLogged(uint256 indexed id, string category, string description, uint256 estimatedValue);
    event OpportunityClaimed(uint256 indexed id, address indexed executor);
    event OpportunityExecuted(uint256 indexed id, uint256 actualValue);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RevenueForwarded(uint256 amount);

    // ============ Constructor ============

    constructor(address _admin) ERC20("Nate Execution Protocol", "NATE") {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Minting Control (Stability Engine) ============

    function setStabilityEngine(address _engine) external onlyRole(ADMIN_ROLE) {
        require(_engine != address(0), "Invalid engine");
        stabilityEngine = _engine;
        _grantRole(MINTER_ROLE, _engine);
    }

    /**
     * @notice Mint new NATE tokens
     * @dev Restricted to MINTER_ROLE (StabilityEngine)
     * @param to The address receiving the minted tokens
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Called by StabilityEngine when Redeeming/Burning
     */
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    // ============ Revenue Routing ============

    /**
     * @dev Forward all received ETH to StabilityEngine (Liquid Backing)
     */
    receive() external payable {
        if (msg.value > 0 && stabilityEngine != address(0)) {
            (bool success, ) = payable(stabilityEngine).call{value: msg.value}("");
            require(success, "Forwarding failed");
            emit RevenueForwarded(msg.value);
        }
    }

    // ============ Opportunity Registry ============

    /**
     * @notice Log a new work opportunity/bounty
     * @param _category The category of work (e.g. "Dev", "Design")
     * @param _description Detailed description
     * @param _estimatedValue Value in USD (18 decimals)
     */
    function logOpportunity(
        string calldata _category,
        string calldata _description, 
        uint256 _estimatedValue
    ) external onlyRole(ADMIN_ROLE) {
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
    
    function claimOpportunity(uint256 _id) external nonReentrant {
        // Can claim if you hold NATE or Stake NATE
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
    
    function markExecuted(uint256 _id, uint256 _actualValue) external onlyRole(ADMIN_ROLE) {
        Opportunity storage opp = opportunities[_id];
        require(opp.status == OpportunityStatus.Claimed, "Not claimed");
        
        opp.status = OpportunityStatus.Executed;
        emit OpportunityExecuted(_id, _actualValue);
    }

    // ============ Staking ============

    /**
     * @notice Stake NATE for governance power
     * @param _amount Amount to stake
     */
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
    
    function getVotingPower(address _user) external view returns (uint256) {
        uint256 staked = stakedBalance[_user];
        if (staked == 0) return 0;
        
        uint256 stakeDuration = block.timestamp - stakeTimestamp[_user];
        uint256 timeMultiplier = 100 + (stakeDuration / 30 days) * 10;
        if (timeMultiplier > 200) timeMultiplier = 200;
        
        return (staked * timeMultiplier) / 100;
    }
    
    // ============ Views ============

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
}
