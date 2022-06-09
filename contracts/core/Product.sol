// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../lzApp/NonblockingLzApp.sol";
import "./ProductCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract Product is Ownable, ProductCore, ERC721Enumerable {
    uint256 public index;

    // emit an event for subscribe
    event Subscribe(
        uint16 srcChainId,
        address sourceAddress,
        address subscriberAddress
    );

    constructor(address _lzEndpoint) ERC721("", "") ProductCore(_lzEndpoint) {}

    // when message is received, increase index by one. Should actually mint a NFT
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64, /*_nonce*/
        bytes memory _payload
    ) internal override {
        index += 1;
        uint256 newTokenId = totalSupply() + 1;

        // decode the message payload
        address subscriber = abi.decode(_payload, (address));
        
        // use assembly to extract the address from the bytes memory parameter
        address sourceAddress;
        assembly {
            sourceAddress := mload(add(_srcAddress, 20))
        }

        // mint a NFT to the subscriber
        // TODO: should change it to the subscriber's address (decoded via the payload)
        _mint(subscriber, newTokenId);

        // TODO: Set the expiry timestamp of the NFT

        emit Subscribe(_srcChainId, sourceAddress, subscriber);
    }
}
