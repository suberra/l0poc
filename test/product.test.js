const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Product", function () {
  let ERC20, ERC20Src, receiver, owner;

  before(async function () {
    accounts = await ethers.getSigners();

    owner = accounts[0];
    receiver = accounts[1];

    ERC20= await ethers.getContractFactory("ERC20Mock");
  });

  beforeEach(async function () {
    // use this chainId
    this.chainId = 123;

    // deploy a test ERC20 mock
    ERC20Src = await ERC20.deploy("TEST", "TESTTOKEN");
    ERC20Src.mint(owner.address, "999999999999");
    this.tokenAddress = ERC20Src.address;


    expect(await ERC20Src.balanceOf(owner.address)).to.be.equal("999999999999")
    expect(await ERC20Src.balanceOf(receiver.address)).to.be.equal("0")

    // create a LayerZero Endpoint mock for testing
    const LayerZeroEndpointMock = await ethers.getContractFactory(
      "LZEndpointMock"
    );
    this.lzEndpointMock = await LayerZeroEndpointMock.deploy(this.chainId);

    // Create terminal on chain A (source A)
    console.log(`Creating a terminal. ${receiver.address}`);
    const Terminal = await ethers.getContractFactory("Terminal");
    this.terminalA = await Terminal.deploy(
      this.lzEndpointMock.address,
      receiver.address,
      this.tokenAddress
    );

    // create two product instances
    const Product = await ethers.getContractFactory("Product");
    this.product = await Product.deploy(this.lzEndpointMock.address);

    this.lzEndpointMock.setDestLzEndpoint(
      this.terminalA.address,
      this.lzEndpointMock.address
    );
    this.lzEndpointMock.setDestLzEndpoint(
      this.product.address,
      this.lzEndpointMock.address
    );

    // sets the contract's source address so they can communicate
    this.terminalA.setTrustedRemote(this.chainId, this.product.address);
    this.product.setTrustedRemote(this.chainId, this.terminalA.address);
  });

  it("User can subscribe to the contract", async function () {
    expect(await this.product.index()).to.be.equal(0); // initial value`
    expect(await ERC20Src.balanceOf(owner.address)).to.be.equal("999999999999")


    ERC20Src.approve(this.product.address, "999999999999");
    expect(await ERC20Src.allowance(owner.address, this.product.address)).to.be.equal("999999999999")


    await this.terminalA.subscribe(this.chainId, this.product.address, 1);

    expect(await this.product.index()).to.be.equal(1); // initial value
  });
});
