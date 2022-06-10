// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IProduct {
    /**
     * @notice Allows the user to subscribe to the product
     */
    function subscribe(uint16 _dstchainId) external payable;


    /**
     * @notice Renews tokenId for another billing cycle
     */
    function renewFor(uint256 tokenId) external payable;

    /** Product info */

    /**
     * @notice Resolves an URI or svg string of an image.
     * @param tokenId the id (tokenId) of the token, or 0 for default nftImage
     * @return image  If a hook is specified, hook function can dynamically return a URI or svg string.
     * Else a NFT level `nftImage` is returned
     */
    function tokenImage(uint256 tokenId) external view returns (string memory);

    /**
     * @notice get product price token and amount
     * @return token address and amount
     */
    function getPriceInfo() external view returns (address, uint256);

    /**
     * @notice get product subscription interval
     * @return interval in seconds or 0 for no expiry
     */
    function getInterval() external view returns (uint256);

    /**
     * @notice get product subscription recipient
     * @return address of recipient
     */
    function getRecipient() external view returns (address);

    /**
     * @notice Get the product's metadata
     * @return URI string uri or base64 encoded json
     */
    function getProductMetadata() external view returns (string memory);

    /** Validation functions */

    /**
     * Checks if the user has a non-expired subscription.
     * @param _user The address of the user
     */
    function hasValidSubscription(address _user) external view returns (bool);

    /**
     * Check if a certain token is valid
     * @param _tokenId the id of the token to check validity
     */
    function isValidSubscription(uint256 _tokenId) external view returns (bool);

    // All ERC721 specific functions

    /**  @notice A distinct URI for a given asset.
     * Follows https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
     * @dev Metadata for product is expected to include theses extended traits: `expiration_time`, `is_expired` and `is_cancelled`
     * @param _tokenId The tokenID we're inquiring about
     * @return String representing the URI for the requested token
     */
    function tokenURI(uint256 _tokenId) external view returns (string memory);
}
