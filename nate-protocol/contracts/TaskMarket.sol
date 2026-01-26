// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TaskMarket
 * @notice A prediction market where investors vote on Nate's future actions.
 * @dev Implements a parimutuel betting system. Winners split the losers' stakes.
 * Time Horizons: IMMEDIATE (2hr), DAILY (24hr), SEASONAL (Quarterly)
 */
contract TaskMarket is Ownable, ReentrancyGuard {

    IERC20 public nateToken;
    address public oracle;

    enum TimeHorizon { IMMEDIATE, DAILY, SEASONAL }
    enum TaskStatus { OPEN, LOCKED, RESOLVED, CANCELLED }

    struct Task {
        uint256 id;
        string description;
        TimeHorizon horizon;
        uint256 deadline;
        uint256 yesPool;
        uint256 noPool;
        TaskStatus status;
        bool outcome; // true = YES, false = NO
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    // taskId => user => Position
    mapping(uint256 => mapping(address => Position)) public positions;

    event TaskCreated(uint256 indexed id, string description, TimeHorizon horizon, uint256 deadline);
    event BetPlaced(uint256 indexed id, address indexed user, bool supportYes, uint256 amount);
    event TaskResolved(uint256 indexed id, bool outcome, uint256 totalPool);
    event RewardClaimed(uint256 indexed id, address indexed user, uint256 amount);

    constructor(address _token, address _oracle) Ownable(msg.sender) {
        nateToken = IERC20(_token);
        oracle = _oracle;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner(), "Not authorized");
        _;
    }

    /**
     * @notice Create a new prediction market for a task
     * @param _description What Nate needs to do (e.g. "Run 5 miles")
     * @param _horizon How long until resolution
     * @param _durationSeconds Exact duration in seconds
     */
    function createTask(
        string calldata _description, 
        TimeHorizon _horizon, 
        uint256 _durationSeconds
    ) external onlyOwner {
        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            description: _description,
            horizon: _horizon,
            deadline: block.timestamp + _durationSeconds,
            yesPool: 0,
            noPool: 0,
            status: TaskStatus.OPEN,
            outcome: false
        });

        emit TaskCreated(taskCount, _description, _horizon, block.timestamp + _durationSeconds);
    }

    /**
     * @notice Place a bet on the outcome
     * @param _taskId The task ID
     * @param _supportYes True to bet YES, False to bet NO
     * @param _amount Amount of NATE to stake
     */
    function bet(uint256 _taskId, bool _supportYes, uint256 _amount) external nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.OPEN, "Market not open");
        require(block.timestamp < task.deadline, "Betting closed");
        require(_amount > 0, "Amount must be > 0");

        // Transfer tokens to contract
        nateToken.transferFrom(msg.sender, address(this), _amount);

        // Update Pools
        if (_supportYes) {
            task.yesPool += _amount;
            positions[_taskId][msg.sender].yesAmount += _amount;
        } else {
            task.noPool += _amount;
            positions[_taskId][msg.sender].noAmount += _amount;
        }

        emit BetPlaced(_taskId, msg.sender, _supportYes, _amount);
    }

    /**
     * @notice Resolve the market (Oracle Only)
     * @param _taskId The task ID
     * @param _outcome Did Nate do it? (True/False)
     */
    function resolveTask(uint256 _taskId, bool _outcome) external onlyOracle {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.OPEN, "Market not open");
        
        task.outcome = _outcome;
        task.status = TaskStatus.RESOLVED;

        uint256 totalPool = task.yesPool + task.noPool;
        emit TaskResolved(_taskId, _outcome, totalPool);
    }

    /**
     * @notice Claim winnings if you bet correctly
     * @param _taskId The task ID
     */
    function claimReward(uint256 _taskId) external nonReentrant {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.RESOLVED, "Not resolved yet");
        
        Position storage pos = positions[_taskId][msg.sender];
        require(!pos.claimed, "Already claimed");

        uint256 reward = 0;
        uint256 totalPool = task.yesPool + task.noPool;

        if (task.outcome) {
            // YES Won
            if (pos.yesAmount > 0) {
                // Share = (MyBet / TotalYes) * TotalPool
                reward = (pos.yesAmount * totalPool) / task.yesPool;
            }
        } else {
            // NO Won
            if (pos.noAmount > 0) {
                // Share = (MyBet / TotalNo) * TotalPool
                reward = (pos.noAmount * totalPool) / task.noPool;
            }
        }

        require(reward > 0, "Nothing to claim");

        pos.claimed = true;
        nateToken.transfer(msg.sender, reward);

        emit RewardClaimed(_taskId, msg.sender, reward);
    }

    /**
     * @notice Emergency cancel if something breaks (Refunds everyone manually later or essentially bricks it)
     * @dev Simple status update for now. 
     */
    function cancelTask(uint256 _taskId) external onlyOwner {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.OPEN, "Cannot cancel");
        task.status = TaskStatus.CANCELLED;
    }
    
    // View function for UI to get odds
    function getOdds(uint256 _taskId) external view returns (uint256 yesPercent, uint256 noPercent) {
        Task storage task = tasks[_taskId];
        uint256 total = task.yesPool + task.noPool;
        if (total == 0) return (0, 0);
        
        yesPercent = (task.yesPool * 100) / total;
        noPercent = (task.noPool * 100) / total;
    }
}
