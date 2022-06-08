const { emitSafe } = require("bull/lib/utils");
const { expect } = require("chai");
const { ethers } = require("hardhat");

let tokenDecimals = 18;

function getTokenAmount(amount) {
  return ethers.BigNumber.from(10).pow(tokenDecimals).mul(amount);
}

describe("Product: ", function () {
  let ERC20, Product, Terminal, LayerZeroEndpointMock;
  let subscriber, subscriber2, receiver, owner;
  let TestERC20Token;
  let product, terminal, terminalB, token, tokenB;
  let lzEndpointBaseMock, lzEndpointRemoteMock;

  const chainIdBase = 1; // Base chain
  const chainIdRemoteA = 2; // Remote Chain A
  const chainIdRemoteB = 3; // Remote Chain B

  before(async function () {
    [owner, receiver, subscriber, subscriber2] = await ethers.getSigners();
    TestERC20Token = await ethers.getContractFactory("TestERC20Token");
    ERC20 = await ethers.getContractFactory("ERC20Mock");
    Product = await ethers.getContractFactory("Product");
    Terminal = await ethers.getContractFactory("Terminal");
    LayerZeroEndpointMock = await ethers.getContractFactory("LZEndpointMock");
  });

  beforeEach(async function () {
    token = await TestERC20Token.deploy("TESTTOKEN", "TT");
    tokenB = await TestERC20Token.deploy("TESTTOKENB", "TTB"); // test token for chain B
    expect(await token.balanceOf(owner.address)).to.be.equal(
      getTokenAmount(100000000)
    );
    expect(await token.balanceOf(receiver.address)).to.be.equal("0");
    expect(await token.balanceOf(subscriber.address)).to.be.equal("0");

    tokenDecimals = await token.decimals();

    // deploy layer zero endpoint mocks
    lzEndpointBaseMock = await LayerZeroEndpointMock.deploy(chainIdBase);
    lzEndpointRemoteMock = await LayerZeroEndpointMock.deploy(chainIdRemoteA);
    lzEndpointRemoteBMock = await LayerZeroEndpointMock.deploy(chainIdRemoteB); // mocks for chain B

    // create terminal and product contracts
    terminal = await Terminal.deploy(
      lzEndpointRemoteMock.address,
      receiver.address,
      token.address
    );
    terminalB = await Terminal.deploy(
      lzEndpointRemoteBMock.address,
      receiver.address,
      tokenB.address
    );
    product = await Product.deploy(lzEndpointBaseMock.address);

    lzEndpointBaseMock.setDestLzEndpoint(
      terminal.address,
      lzEndpointRemoteMock.address
    );
    lzEndpointRemoteMock.setDestLzEndpoint(
      product.address,
      lzEndpointBaseMock.address
    );
    lzEndpointRemoteBMock.setDestLzEndpoint(
      product.address,
      lzEndpointBaseMock.address
    );

    // sets the contract's source address so they can communicate
    await terminal.setTrustedRemote(chainIdBase, product.address);
    await terminalB.setTrustedRemote(chainIdBase, product.address);
    await product.setTrustedRemote(chainIdRemoteA, terminal.address);
    await product.setTrustedRemote(chainIdRemoteB, terminalB.address);

  });

  it("User can subscribe to the contract", async function () {
    await token.transfer(subscriber.address, getTokenAmount(5));
    expect(await token.balanceOf(subscriber.address)).to.be.equal(
      getTokenAmount(5)
    );

    // user approves contract to spend
    await token
      .connect(subscriber)
      .approve(terminal.address, getTokenAmount(5));

    expect(await product.index()).to.be.equal(0); // initial value`

    await expect(
      terminal.connect(subscriber).subscribe(chainIdBase, product.address, 1)
    )
      .to.emit(product, "Subscribe")
      .withArgs(chainIdRemoteA, subscriber.address);

    expect(await product.ownerOf(1)).to.be.equal(subscriber.address);

    expect(await product.index()).to.be.equal(1); // value should be incremented
  });

  it("More than one users can subscribe", async function () {
    await token.transfer(subscriber.address, getTokenAmount(5));
    await tokenB.transfer(subscriber2.address, getTokenAmount(5));

    // user approves contract to spend
    await token
      .connect(subscriber)
      .approve(terminal.address, getTokenAmount(5));

    // user approves contract to spend
    await token
      .connect(subscriber2)
      .approve(terminal.address, getTokenAmount(5));

    await terminal
      .connect(subscriber)
      .subscribe(chainIdBase, product.address, 1);


    // subscriberB
    await tokenB
      .connect(subscriber2)
      .approve(terminalB.address, getTokenAmount(5));
    await terminalB
      .connect(subscriber2)
      .subscribe(chainIdBase, product.address, 1);

    expect(await product.ownerOf(1)).to.be.equal(subscriber.address);
    expect(await product.ownerOf(2)).to.be.equal(subscriber2.address);
  });
});
