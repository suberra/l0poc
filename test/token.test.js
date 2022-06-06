const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("TestToken", function() {

    beforeEach(async function() {
        this.chainId = 123;

        const ERC20Mock = ethers.getContractFactory("ERC20Mock");
        this.erc20Mock = await ERC20Mock.deploy(this.chainId);
    })

    

})