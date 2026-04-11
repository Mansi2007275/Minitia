// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TaskMarketplace {
    address public oracle;

    struct Task {
        uint taskId;
        uint reward;
        address creator;
        bool isFunded;
        bool isPaid;
    }

    mapping(uint => Task) public tasks;

    modifier onlyOracle {
        require(msg.sender == oracle, "Only oracle can call this function");
        _;
    }

    constructor() {
        oracle = msg.sender;
    }

    function createTask(uint _taskId) external payable {
        require(msg.value > 0, "Reward must be greater than 0");
        require(!tasks[_taskId].isFunded, "Task already funded");

        tasks[_taskId] = Task({
            taskId: _taskId,
            reward: msg.value,
            creator: msg.sender,
            isFunded: true,
            isPaid: false
        });
    }

    function releasePayment(uint _taskId, address payable _contributor) external onlyOracle {
        Task storage task = tasks[_taskId];
        require(task.isFunded, "Task not funded");
        require(!task.isPaid, "Task already paid");
        require(_contributor != address(0), "Invalid contributor address");

        task.isPaid = true;
        _contributor.transfer(task.reward);
    }
}
