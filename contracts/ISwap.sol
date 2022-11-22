// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.0;

interface ISwap {
    /**
     * @param tokenA the address of token we are spending
     * @param tokenB the address of token we want
     * @param amountIn amount of tokenA we want to spend
     */
    function exchange(
        address tokenA,
        address tokenB,
        uint amountIn
    ) external;
}
