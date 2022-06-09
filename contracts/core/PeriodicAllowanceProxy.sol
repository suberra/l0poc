// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract PeriodicAllowanceProxy is Context, EIP712 {
    struct Allowance {
        uint256 lastChargeEpoch;
        uint256 allowance;
        uint256 startTime;
        uint256 amountPerPeriod;
        uint256 secondsPerPeriod;
    }

    constructor() EIP712("PeriodicAllowanceProxy", "1") {}

    // owner address -> spender address -> token address -> Allowance
    mapping(address => mapping(address => mapping(address => Allowance))) _allowances;

    // owner address -> nonce
    mapping(address => uint256) public nonces;

    function allowances(
        address owner,
        address token,
        address spender
    ) external view returns (Allowance memory) {
        return _allowances[owner][spender][token];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _approve(
        address owner,
        address token,
        address spender,
        uint256 value,
        uint256 startTime,
        uint256 secondsPerPeriod
    ) private {
        if (value == 0) {
            delete _allowances[owner][spender][token];
        } else {
            // don't bother checking for startTime validity
            require(secondsPerPeriod > 0, "secondsPerPeriod cannot be 0");
            Allowance memory allowance = Allowance({
                lastChargeEpoch: 0,
                allowance: value,
                startTime: startTime,
                amountPerPeriod: value,
                secondsPerPeriod: secondsPerPeriod
            });

            _allowances[owner][spender][token] = allowance;
        }
    }

    function approve(
        address token,
        address spender,
        uint256 value,
        uint256 startTime,
        uint256 secondsPerPeriod
    ) external {
        _approve(_msgSender(), token, spender, value, startTime, secondsPerPeriod);
    }

    function permit(
        address owner,
        address token,
        address spender,
        uint256 value,
        uint256 startTime,
        uint256 secondsPerPeriod,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "Permit expired");

        uint256 nonce = nonces[owner]++; // incr
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Permit(address owner,address token,address spender,uint256 value,uint256 startTime,uint256 secondsPerPeriod,uint256 nonce,uint256 deadline)"),
            owner,
            token,
            spender,
            value,
            startTime,
            secondsPerPeriod,
            nonce,
            deadline));
        bytes32 digest = _hashTypedDataV4(structHash);

        address recoveredSigner = ecrecover(digest, v, r, s);
        require(recoveredSigner != address(0) && recoveredSigner == owner, "Invalid signature");

        _approve(owner, token, spender, value, startTime, secondsPerPeriod);
    }

    function transferFrom(
        address token,
        address owner,
        address recipient,
        uint256 amount
    ) external {
        Allowance storage allowance = _allowances[owner][_msgSender()][token];

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
            IERC20(token).transferFrom(owner, recipient, amount),
            "transferFrom failed"
        );
    }
}
