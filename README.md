# EiP-3009

An ERC20 token contract that implements
[EIP-3009](https://github.com/ethereum/EIPs/issues/3010) and
[EIP-2612](https://eips.ethereum.org/EIPS/eip-2612).


# Setup

- Node >= v12

## Deployement

1. Deploy Swap Address with `npx hardhat run --network networkname scripts/swap.js`
2. After Deployement Verify with `npx hardhat verify --network networkname deployedContractAddress`
3. Replace Q2 address,Swap Address and USDT Address on file deploy inside `script` folder
4. Deploy Contract with command `npx hardhat run --network networkname scripts/deploy.js`

## Run Test Locally

``` npm install ```

```npx hardhat --network ganache test```


---

[MIT License](./LICENSE)