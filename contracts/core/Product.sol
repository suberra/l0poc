// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../lzApp/NonblockingLzApp.sol";

contract Product is NonblockingLzApp {

    uint public index;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    // when message is received, increase index by one. Should actually mint a NFT
    function _nonblockingLzReceive(uint16, bytes memory, uint64, bytes memory) internal override {
        index += 1;
    }

    // when user subscribes, we should first transfer the USDC and then perform a remote mint
    function subscribe(uint16 _dstchainId) public payable {
        _lzSend(_dstchainId, bytes(""), payable(msg.sender), address(0x0), bytes(""));
    }

}