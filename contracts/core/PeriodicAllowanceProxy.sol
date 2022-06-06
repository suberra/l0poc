//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract PeriodicAllowanceProxy is Context {
    struct Allowance {
        uint256 lastChargeEpoch;
        uint256 allowance;
        uint256 startTime;
        uint256 amountPerPeriod;
        uint256 secondsPerPeriod;
    }

    // user address -> spender address -> token address -> Allowance
    mapping(address => mapping(address => mapping(address => Allowance)))
        public allowances;

    function approve(
        address token,
        address spender,
        uint256 amount,
        uint256 startTime,
        uint256 secondsPerPeriod
    ) external {
        if (amount == 0) {
            delete allowances[_msgSender()][spender][token];
        } else {
            // don't bother checking for startTime validity
            require(secondsPerPeriod > 0, "secondsPerPeriod cannot be 0");
            Allowance memory allowance = Allowance({
                lastChargeEpoch: 0,
                allowance: amount,
                startTime: startTime,
                amountPerPeriod: amount,
                secondsPerPeriod: secondsPerPeriod
            });

            allowances[_msgSender()][spender][token] = allowance;
        }
    }

    function transferFrom(
        address token,
        address sender,
        address recipient,
        uint256 amount
    ) external {
        Allowance storage allowance = allowances[sender][_msgSender()][token];

        uint256 amountPerPeriod = allowance.amountPerPeriod;
        uint256 startTime = allowance.startTime;

        require(amountPerPeriod >= amount, "Transfer amount exceeds allowance");
        require(
            startTime <= block.timestamp,
            "Transfer attempted before startTime"
        );

        uint256 curEpoch = (block.timestamp - startTime) /
            allowance.secondsPerPeriod;

        if (curEpoch > allowance.lastChargeEpoch) {
            allowance.lastChargeEpoch = curEpoch;
            allowance.allowance = amountPerPeriod - amount;
        } else {
            // might not be required == solidity 0.8+ checks for underflows
            require(
                allowance.allowance >= amount,
                "Transfer amount exceeds allowance"
            );
            allowance.allowance -= amount;
        }

        // should we check if token is a valid contract too?
        require(
            IERC20(token).transferFrom(sender, recipient, amount),
            "transferFrom failed"
        );
    }
}
