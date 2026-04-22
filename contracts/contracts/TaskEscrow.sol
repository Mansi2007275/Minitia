// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TaskEscrow {
    address public owner;
    address public oracle;

    struct Task {
        address creator;
        address contributor;
        uint256 reward;
        bool paid;
        bool refunded;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward);
    event ContributorAssigned(uint256 indexed taskId, address indexed contributor);
    event PaymentReleased(uint256 indexed taskId, address indexed contributor, uint256 amount);
    event Refunded(uint256 indexed taskId, address indexed creator, uint256 amount);
    event OracleUpdated(address indexed oracleAddress);

    constructor(address oracleAddress) {
        owner = msg.sender;
        oracle = oracleAddress;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyTaskController(uint256 taskId) {
        Task storage task = tasks[taskId];
        require(msg.sender == task.creator || msg.sender == oracle, "Not authorized");
        _;
    }

    function setOracle(address oracleAddress) external onlyOwner {
        require(oracleAddress != address(0), "Invalid oracle");
        oracle = oracleAddress;
        emit OracleUpdated(oracleAddress);
    }

    function createTask() external payable returns (uint256 taskId) {
        require(msg.value > 0, "Reward required");

        taskId = nextTaskId++;
        tasks[taskId] = Task({
            creator: msg.sender,
            contributor: address(0),
            reward: msg.value,
            paid: false,
            refunded: false
        });

        emit TaskCreated(taskId, msg.sender, msg.value);
    }

    function assignContributor(uint256 taskId, address contributor) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.creator || msg.sender == oracle, "Not authorized");
        require(task.contributor == address(0), "Already assigned");
        require(!task.paid && !task.refunded, "Closed task");
        require(contributor != address(0), "Invalid contributor");

        task.contributor = contributor;
        emit ContributorAssigned(taskId, contributor);
    }

    function releasePayment(uint256 taskId) external onlyTaskController(taskId) {
        Task storage task = tasks[taskId];
        require(task.contributor != address(0), "No contributor");
        require(!task.paid && !task.refunded, "Closed task");

        task.paid = true;
        (bool success, ) = task.contributor.call{value: task.reward}("");
        require(success, "Transfer failed");

        emit PaymentReleased(taskId, task.contributor, task.reward);
    }

    function refund(uint256 taskId) external onlyTaskController(taskId) {
        Task storage task = tasks[taskId];
        require(!task.paid && !task.refunded, "Closed task");

        task.refunded = true;
        (bool success, ) = task.creator.call{value: task.reward}("");
        require(success, "Transfer failed");

        emit Refunded(taskId, task.creator, task.reward);
    }
}
