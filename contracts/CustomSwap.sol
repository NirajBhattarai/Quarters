// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./ISwap.sol";
import "./access/Ownable.sol";
import "./token/ERC20/ERC20.sol";
import "./ISwapRouter.sol";

contract CustomSwap is ISwap, Ownable {
    /**
     * Decimal of q2 18 and Decimal of kusdt is 6
     * exchange rate 10**6 kusdt = 100*10**18q2
     * 1 kusdt = 10**14
     */
    uint256 public exchangeRate = 10 ** 14;
    address public masterWallet;

    constructor(address wallet) {
        masterWallet = wallet;
    }

    function setExchangeRate(uint256 rate) public onlyOwner {
        exchangeRate = rate;
    }

    function changeMasterWallet(address newMasterWallet) public onlyOwner {
        masterWallet = newMasterWallet;
    }

    function exchange(
        address tokenA,
        address tokenB,
        uint amountIn
    ) public override {
        ERC20(tokenA).transferFrom(msg.sender, address(this), amountIn);
        uint256 exchangeAmount = amountIn * exchangeRate;
        ERC20(tokenB).transferFrom(masterWallet, msg.sender, exchangeAmount);
    }
}
