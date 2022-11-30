const { expect } = require("chai");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const swapAbi = require("./abis/swap.js");
const { ethers, config } = require("hardhat");
const { signTransferAuthorization } = require("./utils");

describe("MutliTransferSubmitter", () => {
  let owner;
  let addr1;
  let q2;
  let usdt;
  let swap;
  let deployedMultiTransfer;
  const nonce =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  beforeEach(async function () {
    const Quarters = await ethers.getContractFactory("Quarters");
    const testToken = await ethers.getContractFactory("TestToken");
    const multiTransfer = await ethers.getContractFactory(
      "MutliTransferSubmitter"
    );
    usdt = await testToken.deploy();
    q2 = await testToken.deploy();
    swap = await testToken.deploy();
    deployedQuarters = await Quarters.deploy(
      q2.address,
      swap.address,
      usdt.address
    );
    deployedMultiTransfer = await multiTransfer.deploy(
      deployedQuarters.address
    );
    [owner, addr1] = await ethers.getSigners();
  });

  describe("MutliTransferSubmitter", () => {
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
      await deployedQuarters.transfer(address, 100);

      const firstValidAfter = Math.floor(Date.now() / 1000) - 100;
      const firstValidBefore = Math.floor(Date.now() / 1000) + 1000;

      const {
        r: firstr,
        s: firsts,
        v: firstv
      } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        firstValidAfter,
        firstValidBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      const secondValidAfter = Math.floor(Date.now() / 1000) - 1000;
      const secondValidBefore = Math.floor(Date.now() / 1000) + 100;

      const {
        r: secondr,
        s: seconds,
        v: secondv
      } = signTransferAuthorization(
        address,
        addr1.address,
        10,
        secondValidAfter,
        secondValidBefore,
        nonce,
        DOMAIN_SEPARATOR,
        privateKey
      );

      await expect(
        deployedMultiTransfer.multicall([
          [
            address,
            addr1.address,
            10,
            firstValidAfter,
            firstValidBefore,
            nonce,
            firstv,
            firstr,
            firsts
          ],
          [
            address,
            addr1.address,
            10,
            secondValidAfter,
            secondValidBefore,
            nonce,
            secondv,
            secondr,
            seconds
          ]
        ])
      )
        .to.emit(deployedQuarters, "AuthorizationUsed")
        .withArgs(address, nonce);
      expect(await deployedQuarters.balanceOf(address)).to.equal(80);
      expect(await deployedQuarters.balanceOf(addr1.address)).to.equal(20);
    });
  });
});
