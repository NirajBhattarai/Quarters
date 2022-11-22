const { ecsign } = require("ethereumjs-util");
const { ethers, config } = require("hardhat");
const Web3 = require("web3");
const web3 = new Web3(config.networks.ganache.url);

const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = web3.utils.keccak256(
  "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
);

function signTransferAuthorization(
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
  domainSeparator,
  privateKey
) {
  return signEIP712(
    domainSeparator,
    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey
  );
}
function signEIP712(domainSeparator, typeHash, types, parameters, privateKey) {
  const digest = web3.utils.keccak256(
    "0x1901" +
      strip0x(domainSeparator) +
      strip0x(
        web3.utils.keccak256(
          web3.eth.abi.encodeParameters(
            ["bytes32", ...types],
            [typeHash, ...parameters]
          )
        )
      )
  );

  return ecSign(digest, privateKey);
}
function bufferFromHexString(hex) {
  return Buffer.from(strip0x(hex), "hex");
}
function ecSign(digest, privateKey) {
  const { v, r, s } = ecsign(
    bufferFromHexString(digest),
    bufferFromHexString(privateKey)
  );

  return { v, r: hexStringFromBuffer(r), s: hexStringFromBuffer(s) };
}

function strip0x(v) {
  return v.replace(/^0x/, "");
}

function hexStringFromBuffer(buf) {
  return "0x" + buf.toString("hex");
}

module.exports = {
  hexStringFromBuffer,
  strip0x,
  ecSign,
  bufferFromHexString,
  signEIP712,
  signTransferAuthorization
};
