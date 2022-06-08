// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IProduct {
    /**
     * @notice Allows the user to subscribe to the product
     */
    function subscribe(uint16 _dstchainId) external payable;
}
