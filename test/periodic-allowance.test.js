const { expect } = require("chai");
const { ethers } = require("hardhat");

let tokenDecimals = 18;

function getTokenAmount(amount) {
  return ethers.BigNumber.from(10).pow(tokenDecimals).mul(amount);
}

describe("PeriodicAllowance", function () {
  let PeriodicAllowanceProxy;
  let periodic;
  let owner, user, spender;
  let TestERC20Token;
  let token;

  beforeEach(async function () {
    PeriodicAllowanceProxy = await ethers.getContractFactory(
      "PeriodicAllowanceProxy"
    );
    periodic = await PeriodicAllowanceProxy.deploy();
    await periodic.deployed();

    // eslint-disable-next-line no-unused-vars
    [owner, user, spender] = await ethers.getSigners();

    TestERC20Token = await ethers.getContractFactory("TestERC20Token");
    token = await TestERC20Token.deploy("TestToken", "TEST");
    tokenDecimals = await token.decimals();

    await token
      .connect(user)
      .approve(periodic.address, ethers.BigNumber.from(2).pow(255));
  });

  describe("Deployment", function () {
    it("Should not have any allowances set", async function () {
      const currentAllowance = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      expect(currentAllowance.lastChargeEpoch).to.equal(0);
      expect(currentAllowance.allowance).to.equal(0);
      expect(currentAllowance.startTime).to.equal(0);
      expect(currentAllowance.amountPerPeriod).to.equal(0);
      expect(currentAllowance.secondsPerPeriod).to.equal(0);
    });
  });

  describe("Allowances", function () {
    it("Should update allowance when set", async function () {
      const startDate = new Date();

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42),
        ~~(startDate.getTime() / 1000), // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      const currentAllowance = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      expect(currentAllowance.lastChargeEpoch).to.equal(0);
      expect(currentAllowance.allowance).to.equal(getTokenAmount(42));
      expect(currentAllowance.startTime).to.equal(
        ~~(startDate.getTime() / 1000)
      );
      expect(currentAllowance.amountPerPeriod).to.equal(getTokenAmount(42));
      expect(currentAllowance.secondsPerPeriod).to.equal(60 * 60 * 24 * 30);
    });

    it("Should clear allowance if amount is 0", async function () {
      const startDate = new Date();

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42),
        ~~(startDate.getTime() / 1000), // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      await periodic
        .connect(user)
        .approve(
          token.address,
          spender.address,
          0,
          ~~(startDate.getTime() / 1000),
          60 * 60 * 24 * 30
        );

      const currentAllowance = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      expect(currentAllowance.lastChargeEpoch).to.equal(0);
      expect(currentAllowance.allowance).to.equal(0);
      expect(currentAllowance.startTime).to.equal(0);
      expect(currentAllowance.amountPerPeriod).to.equal(0);
      expect(currentAllowance.secondsPerPeriod).to.equal(0);
    });

    it("Should subtract from allowance on transfer", async function () {
      const startDate = new Date();
      await token.transfer(user.address, getTokenAmount(30));

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42), // amount; 42 units
        ~~(startDate.getTime() / 1000), // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      const tx = await periodic
        .connect(spender)
        .transferFrom(
          token.address,
          user.address,
          owner.address,
          getTokenAmount(30)
        );

      const currentAllowance = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      expect(currentAllowance.lastChargeEpoch).to.equal(
        ~~(
          ((await ethers.provider.getBlock(tx.blockNumber)).timestamp -
            ~~(startDate.getTime() / 1000)) /
          currentAllowance.secondsPerPeriod
        )
      );
      expect(currentAllowance.allowance).to.equal(
        getTokenAmount(42).sub(getTokenAmount(30))
      );
    });

    it("Should subtract from existing allowance instead of resetting when lastChargeEpoch is eq curEpoch", async function () {
      const startDate = new Date();
      await token.transfer(user.address, getTokenAmount(35));

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42), // amount; 42 units
        ~~(startDate.getTime() / 1000), // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      await periodic
        .connect(spender)
        .transferFrom(
          token.address,
          user.address,
          owner.address,
          getTokenAmount(5)
        );

      const tx = await periodic
        .connect(spender)
        .transferFrom(
          token.address,
          user.address,
          owner.address,
          getTokenAmount(30)
        );

      const currentAllowance = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      expect(currentAllowance.lastChargeEpoch).to.equal(
        ~~(
          ((await ethers.provider.getBlock(tx.blockNumber)).timestamp -
            currentAllowance.startTime) /
          currentAllowance.secondsPerPeriod
        )
      );
      expect(currentAllowance.allowance).to.equal(
        getTokenAmount(42).sub(getTokenAmount(35))
      );
    });

    it("Should reset allowance if lastChargeEpoch is less than curEpoch", async function () {
      const startDate = new Date();
      await token.transfer(user.address, getTokenAmount(46));

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42), // amount; 42 units
        ~~(startDate.getTime() / 1000), // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      const tx1 = await periodic
        .connect(spender)
        .transferFrom(
          token.address,
          user.address,
          owner.address,
          getTokenAmount(30)
        );

      const allowance1 = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      const epoch1 = ~~(
        ((await ethers.provider.getBlock(tx1.blockNumber)).timestamp -
          allowance1.startTime) /
        allowance1.secondsPerPeriod
      );

      expect(allowance1.lastChargeEpoch).to.equal(epoch1);
      expect(allowance1.allowance).to.equal(
        getTokenAmount(42).sub(getTokenAmount(30))
      );

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        allowance1.startTime.add(allowance1.secondsPerPeriod).toHexString(),
      ]);

      const tx2 = await periodic
        .connect(spender)
        .transferFrom(
          token.address,
          user.address,
          owner.address,
          getTokenAmount(16)
        );

      expect(
        (await ethers.provider.getBlock(tx2.blockNumber)).timestamp
      ).to.equal(allowance1.startTime.add(allowance1.secondsPerPeriod));

      const allowance2 = await periodic.allowances(
        user.address,
        token.address,
        spender.address
      );

      const epoch2 = epoch1 + 1;

      expect(allowance2.lastChargeEpoch).to.equal(epoch2);
      expect(allowance2.allowance).to.equal(
        getTokenAmount(42).sub(getTokenAmount(16))
      );
    });

    it("Should revert if block timestamp is before start time", async function () {
      await token.transfer(user.address, getTokenAmount(1));

      const startTime =
        (await ethers.provider.getBlock("latest")).timestamp + 500;

      await periodic.connect(user).approve(
        token.address, // token
        spender.address, // spender
        getTokenAmount(42), // amount; 42 units
        startTime, // startTime
        60 * 60 * 24 * 30 // secondsPerPeriod; 1 month
      );

      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime - 1]);

      await expect(
        periodic
          .connect(spender)
          .transferFrom(
            token.address,
            user.address,
            owner.address,
            getTokenAmount(1)
          )
      ).to.be.revertedWith("Transfer attempted before startTime");
    });

    it("Should revert if transfer amount exceeds user balance", async function () {
      const startDate = new Date();
      await token.transfer(user.address, getTokenAmount(5));

      const userBalance = await token.balanceOf(user.address);

      await periodic
        .connect(user)
        .approve(
          token.address,
          spender.address,
          userBalance.add(1),
          ~~(startDate.getTime() / 1000),
          60 * 60 * 24 * 30
        );

      await expect(
        periodic
          .connect(spender)
          .transferFrom(
            token.address,
            user.address,
            owner.address,
            userBalance.add(1)
          )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should revert if transfer amount exceeds allowance", async function () {
      const startDate = new Date();
      await token.transfer(user.address, getTokenAmount(5));

      await periodic
        .connect(user)
        .approve(
          token.address,
          spender.address,
          50,
          ~~(startDate.getTime() / 1000),
          60 * 60 * 24 * 30
        );

      await expect(
        periodic
          .connect(spender)
          .transferFrom(token.address, user.address, owner.address, 51)
      ).to.be.revertedWith("Transfer amount exceeds allowance");

      await periodic
        .connect(spender)
        .transferFrom(token.address, user.address, owner.address, 49);

      await expect(
        periodic
          .connect(spender)
          .transferFrom(token.address, user.address, owner.address, 2)
      ).to.be.revertedWith("Transfer amount exceeds allowance");
    });
  });
});
