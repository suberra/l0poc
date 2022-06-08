// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../lzApp/NonblockingLzApp.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
    @dev The contract will be deployed on remote chains, and any user can use it to subscribe to
    contracts that resides on other chains (destination chains);
 */

contract Terminal is NonblockingLzApp {
    // constant files
    address public token; // address of the token (e.g. USDC)
    address public receivingAddress;
    // TODO: this subscription amount should be queried from the base contract

    uint256 public subscriptionAmount = 1;

    constructor(
        address _lzEndpoint,
        address receivingAddress_,
        address token_
    )  NonblockingLzApp(_lzEndpoint) {
        receivingAddress = receivingAddress_;
        token = token_;
    }

    // @dev temporary left empty as subscription is assumed to be one-way.
    // This will be triggered when the Product contract tries to call the destination terminal
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory
    ) internal override {}

    // /**
    //  * @notice Subscribes to the product after submitting a permit to the PeriodicAllowanceProxy.
    //  *         Owner, token, spender, value, and secondsPerPeriod are inferred.
    //  * @param startTime the start time of the permit
    //  * @param deadline the time at which the permit expires
    //  * @param v signature v
    //  * @param r signature r
    //  * @param s signature s
    //  */
    // function subscribeWithPermit(
    //     uint256 startTime,
    //     uint256 deadline,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s
    // ) public {
    //     allowanceProxy.permit(
    //         _msgSender(), // owner
    //         subPriceToken, // token
    //         address(this), // this address, duh
    //         subPriceAmount, // value
    //         startTime,
    //         subPeriod, // secondsPerPeriod
    //         deadline,
    //         v,
    //         r,
    //         s
    //     );

    //     _subscribe(_msgSender(), _msgSender(), true);
    // }

    // when user subscribes, we should first transfer the USDC and then perform a remote mint
    function subscribe(
        uint16 _dstChainId,
        address _dstProductAddr,
        uint256 _data
    ) public payable {
        require(
            this.isTrustedRemote(
                _dstChainId,
                abi.encodePacked(_dstProductAddr)
            ),
            "you must allow inbound mesages"
        );

        // TODO change this to the periodic allowance contract
        require(
            IERC20(token).transferFrom(msg.sender, receivingAddress, subscriptionAmount),
            "transfer failed"
        );
        bytes memory payload = abi.encode(msg.sender);

        // example payload that can be wrapped
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(0x0),
            bytes("")
        );
    }
}
