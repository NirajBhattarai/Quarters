const { expect } = require("chai");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const swapAbi = require("./abis/swap.js");
const { ethers, config } = require("hardhat");
const { signTransferAuthorization } = require("./utils");

describe("Quarters", () => {
  const name = "Quarters";
  const symbol = "Q";
  let owner;
  let addr1;
  let oldDecimalPoint = 1000000;
  let newDecimalPoint = 1000;
  let q2;
  let usdt;
  let swap;
  const nonce =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  let customSwapContract;

  beforeEach(async function () {
    const Quarters = await ethers.getContractFactory("Quarters");
    const testToken = await ethers.getContractFactory("TestToken");
    customSwapContract = await ethers.getContractFactory("CustomSwap");
    usdt = await testToken.deploy();
    q2 = await testToken.deploy();
    swap = await testToken.deploy();
    deployedQuarters = await Quarters.deploy(
      q2.address,
      swap.address,
      usdt.address
    );

    [owner, addr1] = await ethers.getSigners();
  });

  it("has a name", async function () {
    expect(await deployedQuarters.name()).to.equal(name);
  });

  it("has a symbol", async function () {
    expect(await deployedQuarters.symbol()).to.equal(symbol);
  });

  it("has 18 decimals", async function () {
    expect(await deployedQuarters.decimals()).to.equal(0);
  });

  describe("Decimal Point", () => {
    it("Change Decimal Point", async function () {
      await expect(deployedQuarters.changeDecimalPoint(newDecimalPoint))
        .to.emit(deployedQuarters, "DecimalPointChanged")
        .withArgs(oldDecimalPoint, newDecimalPoint);
    });
    it("Reverts Transaction if Non Owner Tries to change Decimal Point", async function () {
      await expect(
        deployedQuarters.connect(addr1).changeDecimalPoint(newDecimalPoint)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Change TransferState", () => {
    it("Change Transfer State", async function () {
      expect(await deployedQuarters.pauseTransfer()).to.equal(false);
      await deployedQuarters.changeTransferState();
      expect(await deployedQuarters.pauseTransfer()).to.equal(true);
    });
    it("Reverts Transaction if Non Owner Tries to change Transfer State", async function () {
      await expect(
        deployedQuarters.connect(addr1).changeTransferState()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Change USDTRate", () => {
    const newUSDTRate = 400;
    it("Change USDT Rate", async function () {
      const oldUSDTRate = await deployedQuarters.usdtRate();
      expect(await deployedQuarters.setUsdtRate(newUSDTRate))
        .to.emit(deployedQuarters, "USDTRateChanged")
        .withArgs(oldUSDTRate, newUSDTRate);
    });
    it("Reverts Transaction if Non Owner Tries to change USDT Rate", async function () {
      await expect(
        deployedQuarters.connect(addr1).setUsdtRate(newUSDTRate)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Change Q2", () => {
    const newQ2 = "0x5ce3d72AF3dF617E2663a94B88a7d7E030735d81";

    it("Change Q2 Address", async function () {
      const oldQ2Address = await deployedQuarters.q2();
      expect(await deployedQuarters.changeQ2(newQ2))
        .to.emit(deployedQuarters, "ChangedQ2")
        .withArgs(oldQ2Address, newQ2);
    });
    it("Reverts Transaction if Non Owner Tries to Change Q2 Address", async function () {
      await expect(
        deployedQuarters.connect(addr1).changeQ2(newQ2)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("WithDraw", async () => {
    it("Reverts if User is not active developer", async () => {
      await expect(deployedQuarters.withdraw(1000)).to.be.revertedWith(
        "Quarters: Not An Active Developer"
      );
    });
    it("Reverts if User is doesnot have sufficeint quarters", async () => {
      await deployedQuarters.setDeveloperStatus(owner.address, true);
      await expect(deployedQuarters.withdraw(1000)).to.be.revertedWith(
        "Insufficient Value"
      );
    });
    it("Withdraw funds", async () => {
      await deployedQuarters.setDeveloperStatus(addr1.address, true);
      await usdt.approve(deployedQuarters.address, "1000000000000000000000000");
      swap = await deployMockContract(owner, swapAbi.abi);
      await swap.mock.exchange.returns();
      await deployedQuarters.changeSwapAddress(swap.address);
      await deployedQuarters.buy("1000000000");
      await deployedQuarters.transfer(addr1.address, 10000);
      const usdtAmountOn = await usdt.balanceOf(deployedQuarters.address);
      const totalSupply = await deployedQuarters.totalSupply();
      const unitEarning = Math.floor(usdtAmountOn / totalSupply);
      await expect(deployedQuarters.connect(addr1).withdraw(1000))
        .to.emit(deployedQuarters, "Withdraw")
        .withArgs(addr1.address, unitEarning * 1000);
    });
  });

  describe("Buy Quarters", () => {
    it("Revert Transaction if User Tries To Buy Without Allowance", async function () {
      await expect(deployedQuarters.buy(1000000)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });
    it("Revert Transaction if Doesn't Have Sufficient Balance", async function () {
      await expect(
        deployedQuarters.connect(addr1).buy(1000000)
      ).to.be.revertedWith("Address Doesn't Have Sufficient Balance");
    });

    it("Mint Token If User Have Given Allowance and Have Sufficient USDT", async function () {
      swap = await deployMockContract(owner, swapAbi.abi);
      const rate = await deployedQuarters.usdtRate();
      await usdt.approve(deployedQuarters.address, "1000000000000000000000000");

      await swap.mock.exchange.returns();
      await deployedQuarters.changeSwapAddress(swap.address);
      await expect(deployedQuarters.buy(1000000))
        .to.emit(deployedQuarters, "QuartersOrdered")
        .withArgs(owner.address, 1000000, rate);
      const balance = await deployedQuarters.balanceOf(owner.address);
      expect(balance).to.equal(rate);
    });

    it("Mint Token If User Have Given Allowance and Have Sufficient USDT", async function () {
      swap = await customSwapContract.deploy(owner.address);
      const rate = await deployedQuarters.usdtRate();
      await usdt.approve(deployedQuarters.address, "1000000000000000000000000");

      await q2.approve(
        swap.address,
        "1000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      await deployedQuarters.changeSwapAddress(swap.address);
      await expect(deployedQuarters.buy(1000000))
        .to.emit(deployedQuarters, "QuartersOrdered")
        .withArgs(owner.address, 1000000, rate);
      const balance = await deployedQuarters.balanceOf(owner.address);
      expect(balance).to.equal(rate);
    });
  });
  describe("Transfer With Authorization", () => {
    let DOMAIN_SEPARATOR;
    beforeEach(async () => {
      DOMAIN_SEPARATOR = await deployedQuarters.DOMAIN_SEPARATOR();
      const rate = await deployedQuarters.usdtRate();
      await usdt.approve(deployedQuarters.address, "1000000000000000000000000");
      swap = await deployMockContract(owner, swapAbi.abi);
      await swap.mock.exchange.returns();
      await deployedQuarters.changeSwapAddress(swap.address);
      await expect(deployedQuarters.buy(1000000))
        .to.emit(deployedQuarters, "QuartersOrdered")
        .withArgs(owner.address, 1000000, rate);
    });
    it("executes a transfer when a valid authorization is given", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );
      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) - 100;
      const validBefore = Math.floor(Date.now() / 1000) + 1000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      )
        .to.emit(deployedQuarters, "AuthorizationUsed")
        .withArgs(address, nonce);
      expect(await deployedQuarters.balanceOf(address)).to.equal(0);
      expect(await deployedQuarters.balanceOf(addr1.address)).to.equal(10);
    });
    it("reverts if the signature does not match given parameters", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );
      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) - 100;
      const validBefore = Math.floor(Date.now() / 1000) + 1000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        5,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith("ERC20Authorization: invalid signature");
    });

    it("reverts if the signature is not signed with the right key", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );

      const anotherUserPrivateKey =
        "55ef7a25bba3449344d8a1e525ba3ca4999bdc763be4efaf9e94a4de396f8370";
      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) - 100;
      const validBefore = Math.floor(Date.now() / 1000) + 1000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        anotherUserPrivateKey
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith("ERC20Authorization: invalid signature");
    });
    it("reverts if the authorization is not yet valid", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );

      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) + 1000;
      const validBefore = Math.floor(Date.now() / 1000) + 2000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith("EIP3009: authorization is not yet valid");
    });
    it("reverts if the authorization is expired", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );

      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) - 1000;
      const validBefore = Math.floor(Date.now() / 1000) - 2000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith("EIP3009: authorization is expired");
    });
    it("reverts if the authorization has a nonce that has already been used by the signer", async function () {
      const { privateKey, address } = ethers.utils.HDNode.fromMnemonic(
        config.networks.hardhat.accounts.mnemonic
      );

      await deployedQuarters.transfer(address, 10);
      expect(await deployedQuarters.balanceOf(address)).to.equal(10);

      const validAfter = Math.floor(Date.now() / 1000) - 1000;
      const validBefore = Math.floor(Date.now() / 1000) + 2000;

      const { r, s, v } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await deployedQuarters.transferWithAuthorization(
        address,
        addr1.address,
        10,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s
      );

      await expect(
        deployedQuarters.transferWithAuthorization(
          address,
          addr1.address,
          10,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWith("EIP3009: authorization is used");
    });
  });
});
