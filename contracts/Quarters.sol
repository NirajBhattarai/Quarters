// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/ERC20/ERC20.sol";
import "./token/ERC20/extensions/ERC20Authorization.sol";
import "./access/Ownable.sol";
import "./utils/math/SafeMath.sol";
import "./ISwap.sol";
import "./IQ2.sol";

contract Quarters is ERC20Authorization, Ownable {
    using SafeMath for uint256;
    string public TokenName = "Quarters";
    string public TokenSymbol = "Q";

    uint256 public usdtRate = 571;

    uint256 private royaltyBasisPoints = 1500; // royalties in Basis Points

    uint256 public MAX_BASISPOINTS = 10000; //Max Value

    uint256 public USDT_DECIMAL_POINT = 10**6;

    // for now we are using six 0xef82b1c6a550e730d8283e1edd4977cd01faf435
    // once we create liquidity pool we will place actual q2 address
    address public q2;

    // List of developers
    // address -> status
    mapping(address => bool) public developers;

    bool public pauseTransfer = false;

    // token used to buy quarters
    // for mainnet 0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167
    ERC20 public usdt;

    address public swapAddress;

    string internal constant ZERO_ADDRESS_ERROR =
        "Address Cannot be Zero Address";
    string internal constant INSUFFICIENT_BALANCE_ERROR =
        "Address Doesn't Have Sufficient Balance";
    string internal constant CONTRACT_PAUSED_ERROR = "Contract is Paused";

    // events

    // usdt rate changed
    event USDTRateChanged(uint256 currentRate, uint256 newRate);

    event ChangedQ2(address indexed oldQ2, address indexed newQ2);
    event DeveloperStatusChanged(address indexed developer, bool status);
    event USDTChanged(
        address indexed oldUSDTAddress,
        address indexed newUSDTAddress
    );
    event DecimalPointChanged(uint256 oldDecimalPoint, uint256 newDecimalPoint);
    event SwapAddressChanged(
        address indexed oldAddress,
        address indexed newAddress
    );

    event QuartersOrdered(
        address indexed sender,
        uint256 usdtValue,
        uint256 tokens
    );

    event Withdraw(address indexed developer, uint256 value);

    constructor(
        address _q2,
        address _swapAddress,
        address _usdt
    ) ERC20(TokenName, TokenSymbol) ERC20Authorization(TokenName) {
        q2 = _q2;
        swapAddress = _swapAddress;
        usdt = ERC20(_usdt);
    }

    // developer modifier
    modifier onlyActiveDeveloper() {
        require(
            developers[msg.sender] == true,
            "Quarters: Not An Active Developer"
        );
        _;
    }

    function changeDecimalPoint(uint256 newDecimalPoint) public onlyOwner {
        uint256 oldDecimalPoint = USDT_DECIMAL_POINT;
        USDT_DECIMAL_POINT = newDecimalPoint;
        emit DecimalPointChanged(oldDecimalPoint, USDT_DECIMAL_POINT);
    }

    function changeSwapAddress(address newSwapAddress) public onlyOwner {
        address oldSwapAddress = swapAddress;
        swapAddress = newSwapAddress;
        emit SwapAddressChanged(oldSwapAddress, newSwapAddress);
    }

    function changeTransferState() public onlyOwner {
        pauseTransfer = !pauseTransfer;
    }

    function setUsdtRate(uint256 rate) public onlyOwner {
        // Quarters token to be provided for 1 usdt
        require(rate > 0, "Quarters: Rate must be greater or equal to 1");
        usdtRate = rate;
        emit USDTRateChanged(usdtRate, rate);
    }

    function changeQ2(address _q2) public onlyOwner {
        address oldQ2 = q2;
        q2 = _q2;
        emit ChangedQ2(oldQ2, _q2);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override returns (bool success) {
        require(!pauseTransfer, CONTRACT_PAUSED_ERROR);
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value)
        public
        override
        returns (bool success)
    {
        require(!pauseTransfer, CONTRACT_PAUSED_ERROR);
        return super.transfer(_to, _value);
    }

    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        require(!pauseTransfer, CONTRACT_PAUSED_ERROR);
        super.receiveWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        require(!pauseTransfer, CONTRACT_PAUSED_ERROR);
        super.transferWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );
    }

    /**
     * Change usdt Address if required so that we dont have to redeploy contract
     */
    function changeusdt(address usdtAddress) public onlyOwner {
        require(address(0) != usdtAddress, ZERO_ADDRESS_ERROR);
        address oldUSDT = address(usdt);
        usdt = ERC20(usdtAddress);
        emit USDTChanged(oldUSDT, address(usdt));
    }

    /**
     * Developer status
     */
    function setDeveloperStatus(address _address, bool status)
        public
        onlyOwner
    {
        developers[_address] = status;
        emit DeveloperStatusChanged(_address, status);
    }

    /**
     * Buy quarters by sending usdt based upon usdtRate to contract address default : 571
     * @param usdtAmount total usdt amount
     */

    function buy(uint256 usdtAmount) public {
        _buy(msg.sender, usdtAmount);
    }

    /**
     * Buy quarters for specific address and take approval to spend by spender by sending kusdt based upon kusdtRate to contract address default : 571
     * @param buyer address to send quarters
     * @param usdtAmount total kusdt amount to spend
     */

    function buyFor(address buyer, uint256 usdtAmount) public payable {
        uint256 _value = _buy(buyer, usdtAmount);
        emit Approval(buyer, msg.sender, _value);
    }

    // returns number of quarters buyer got
    function _buy(address buyer, uint256 usdtAmount)
        internal
        returns (uint256)
    {
        require(
            usdt.balanceOf(msg.sender) >= usdtAmount,
            INSUFFICIENT_BALANCE_ERROR
        );
        require(buyer != address(0), ZERO_ADDRESS_ERROR);
        usdt.transferFrom(msg.sender, address(this), usdtAmount);
        uint256 nq = usdtAmount.mul(usdtRate).div(USDT_DECIMAL_POINT);

        _mint(buyer, nq);

        emit QuartersOrdered(buyer, usdtAmount, nq);
        uint256 Q2BurnAmount = usdtAmount.mul(royaltyBasisPoints).div(
            MAX_BASISPOINTS
        );

        usdt.approve(swapAddress, Q2BurnAmount);
        ISwap(swapAddress).exchange(address(usdt), q2, Q2BurnAmount);
        IQ2(q2)._burn(address(this), ERC20(q2).balanceOf(address(this)));
        return nq;
    }

    function withdraw(uint256 value) public onlyActiveDeveloper {
        require(balanceOf(msg.sender) >= value, "Insufficient Value");

        uint256 unitEarning = usdt.balanceOf(address(this)).div(totalSupply());

        _burn(msg.sender, value);

        // earning for developers
        usdt.transfer(msg.sender, unitEarning.mul(value));

        emit Withdraw(msg.sender, unitEarning.mul(value));
    }

    function emergencyExit() public onlyOwner {
        usdt.transfer(msg.sender, usdt.balanceOf(address(this)));
    }
}
