// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../lzApp/NonblockingLzApp.sol";
import "./ProductCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract Product is Ownable, ProductCore, ERC721Enumerable {
    uint256 public index;

    // emit an event for subscribe
    event Subscribe(address);

    constructor(address _lzEndpoint) ERC721("", "") ProductCore(_lzEndpoint) {}

    // when message is received, increase index by one. Should actually mint a NFT
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory
    ) internal override {
        index += 1;
        uint256 newTokenId = totalSupply() + 1;

        // mint a NFT to the subscriber
        // TODO: should change it to the subscriber's address (decoded via the payload)
        _mint(msg.sender, newTokenId);

        // TODO: Set the expiry timestamp of the NFT

        emit Subscribe(msg.sender);
    }
}
