// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WorkforceLogger {
    event TaskCompleted(
        address indexed employeeWallet,
        string taskId,
        string taskHash,
        uint256 timestamp
    );

    function logTaskCompletion(string memory taskId, string memory taskHash) public {
        emit TaskCompleted(msg.sender, taskId, taskHash, block.timestamp);
    }
}
