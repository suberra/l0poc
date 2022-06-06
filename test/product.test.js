const { expect } = require("chai");
const { ethers } = require("hardhat");

let tokenDecimals = 18;

function getTokenAmount(amount) {
  return ethers.BigNumber.from(10).pow(tokenDecimals).mul(amount);
}


describe("Product: ", function () {
  let ERC20, Product, Terminal, LayerZeroEndpointMock;
  let subscriber, receiver, owner;
  let TestERC20Token; 
  let product, terminal, token;
  let lzEndpointBaseMock, lzEndpointRemoteMock;

  const chainIdBase = 1; // Base chain
  const chainIdRemote = 2;  // Remote Chain

  before(async function () {
    [owner, receiver, subscriber ] = await ethers.getSigners();
    TestERC20Token = await ethers.getContractFactory("TestERC20Token");
    ERC20= await ethers.getContractFactory("ERC20Mock");
    Product = await ethers.getContractFactory("Product");
    Terminal = await ethers.getContractFactory("Terminal");
    LayerZeroEndpointMock = await ethers.getContractFactory(
      "LZEndpointMock"
    );
  });

  beforeEach(async function () {
    // use this chainId
    this.chainId = 123;

    token = await TestERC20Token.deploy("TESTTOKEN", "TT");
    expect(await token.balanceOf(owner.address)).to.be.equal(getTokenAmount(100000000));
    expect(await token.balanceOf(receiver.address)).to.be.equal("0")
    expect(await token.balanceOf(subscriber.address)).to.be.equal("0")

    tokenDecimals = await token.decimals();

    // depploy layer zero endpoint mocks
    lzEndpointBaseMock = await LayerZeroEndpointMock.deploy(chainIdBase);
    lzEndpointRemoteMock = await LayerZeroEndpointMock.deploy(chainIdRemote);
    
    // create terminal and product contracts 
    terminal = await Terminal.deploy(
      lzEndpointRemoteMock.address,
      receiver.address,
      token.address
      );
    product = await Product.deploy(lzEndpointBaseMock.address);

    lzEndpointBaseMock.setDestLzEndpoint(terminal.address, lzEndpointRemoteMock.address);
    lzEndpointRemoteMock.setDestLzEndpoint(product.address, lzEndpointBaseMock.address);

    // sets the contract's source address so they can communicate
    await terminal.setTrustedRemote(chainIdBase, product.address);
    await product.setTrustedRemote(chainIdRemote, terminal.address);

  });

  it("User can subscribe to the contract", async function () {

    await token.transfer(subscriber.address, getTokenAmount(5));
    expect(await token.balanceOf(subscriber.address)).to.be.equal(getTokenAmount(5));

    // user approves contract to spend
    await token.connect(subscriber).approve(terminal.address, getTokenAmount(5));

    expect(await product.index()).to.be.equal(0); // initial value`

    await terminal.connect(subscriber).subscribe(chainIdBase, product.address, 1);

    expect(await product.index()).to.be.equal(1); // initial value
  });
});
