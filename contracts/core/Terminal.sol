// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../lzApp/NonblockingLzApp.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


// Terminal contract will be deployed on remote chains and will process the payments and trigger a subscribe transaction on the destination (base chain)
contract Terminal is NonblockingLzApp {

    // constant files
    address public token; // address of the token (e.g. USDC)
    address public receivingAddress;

    constructor(address _lzEndpoint, address receivingAddress_, address token_) NonblockingLzApp(_lzEndpoint) {
        receivingAddress = receivingAddress_;
        token = token_;
    }

    // when message is received, increase index by one. Should actually mint a NFT
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory
    ) internal override {}

    // when user subscribes, we should first transfer the USDC and then perform a remote mint
    function subscribe(uint16 _dstChainId, address _dstProductAddr, uint _data) public payable {

        require(this.isTrustedRemote(_dstChainId, abi.encodePacked(_dstProductAddr)), "you must allow inbound mesages");

        // todo fetch the amount of money that needs to be subscribed
        uint256 amount = 1;
        // // to be replaced with periodic allowance
        require(IERC20(token).transferFrom(msg.sender, receivingAddress, amount), "transferred failed");

        // example payload that can be wrapped 
        _lzSend(
            _dstChainId,
            bytes(""),
            payable(msg.sender),
            address(0x0),
            bytes("")
        );
    }
}
