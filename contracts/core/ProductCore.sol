// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../lzApp/NonblockingLzApp.sol";

abstract contract ProductCore is NonblockingLzApp {
    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}
}
