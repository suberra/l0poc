//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20Token is ERC20 {
  constructor() ERC20("TestToken", "TEST") {
    _mint(msg.sender, 100000000 * 10 ** decimals());
  }
}