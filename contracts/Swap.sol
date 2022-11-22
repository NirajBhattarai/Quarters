pragma solidity 0.8.0;

import "./ISwap.sol";
import "./access/Ownable.sol";
import "./token/ERC20/ERC20.sol";
import "./ISwapRouter.sol";

contract Swap is Ownable {
    /**
     * Factory Address involved in token Swap
     */
    address public FACTORY_ADDRESS = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // Fee of Pool
    uint24 public fee = 500;

    function exchange(
        address tokenA,
        address tokenB,
        uint amountIn
    ) public {
        ERC20(tokenA).transferFrom(msg.sender, address(this), amountIn);
        ERC20(tokenA).approve(FACTORY_ADDRESS, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenA,
                tokenOut: tokenB,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        ISwapRouter(FACTORY_ADDRESS).exactInputSingle(params);
    }

    /**
     * @dev Changing router address
     *
     */
    function changeRouter(address routerAddress) public onlyOwner {
        FACTORY_ADDRESS = routerAddress;
    }

    function changeFee(uint24 newFee) public onlyOwner {
        fee = newFee;
    }
}
