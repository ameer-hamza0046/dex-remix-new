// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./LPToken.sol";

contract DEX {
    IERC20 public tokenA;
    IERC20 public tokenB;
    LPToken public lpToken;

    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public feeA;
    uint256 public feeB;
    uint256 public constant FEE_PERCENT = 2;
    uint8 public constant DECIMALS = 18;

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        lpToken = new LPToken(address(this));
        reserveA = 0;
        reserveB = 0;
        feeA = 0;
        feeB = 0;
    }

    function getSpotPrice() external view returns (uint256) {
        if (reserveB == 0) {
            return 0;
        }
        return fixedDiv(reserveA, reserveB);
    }

    function lPTBalanceOf(address _addr) external view returns (uint256) {
        return lpToken.balanceOf(_addr);
    }

    function reserveLPT() external view returns (uint256) {
        return lpToken.totalSupply();
    }

    function deposit(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        if (reserveA == 0 && reserveB == 0) {
            require(lpToken.totalSupply() == 0, "LP already exists");

            tokenA.transferFrom(msg.sender, address(this), amountA);
            tokenB.transferFrom(msg.sender, address(this), amountB);

            reserveA += amountA;
            reserveB += amountB;

            uint256 lpAmount = sqrt(amountA * amountB);
            require(lpAmount > 0, "LP amount too small");
            lpToken.mint(msg.sender, lpAmount);
        } else {
            uint256 ratio1 = (amountA * 1e18) / amountB;
            uint256 ratio2 = (reserveA * 1e18) / reserveB;
            uint256 diff = ratio1 > ratio2 ? ratio1 - ratio2 : ratio2 - ratio1;

            require(diff < 1e15, "Provided amounts must match pool ratio");

            tokenA.transferFrom(msg.sender, address(this), amountA);
            tokenB.transferFrom(msg.sender, address(this), amountB);

            uint256 totalSupply = lpToken.totalSupply();
            uint256 shareA = (amountA * totalSupply) / reserveA;
            uint256 shareB = (amountB * totalSupply) / reserveB;
            uint256 lpAmount = min(shareA, shareB);

            require(lpAmount > 0, "LP amount too small");

            lpToken.mint(msg.sender, lpAmount);

            reserveA += amountA;
            reserveB += amountB;
        }
    }

    function withdraw(uint256 amountLP) external {
        require(amountLP > 0, "Amount must be greater than 0");

        uint256 totalSupply = lpToken.totalSupply();
        require(totalSupply > 0, "No liquidity in pool");

        uint256 shareA = (amountLP * reserveA) / totalSupply;
        uint256 shareB = (amountLP * reserveB) / totalSupply;

        require(shareA > 0 && shareB > 0, "Withdraw amount too small");

        // Burn LP tokens from user
        lpToken.burn(msg.sender, amountLP);

        // Update reserves
        reserveA -= shareA;
        reserveB -= shareB;

        // Transfer tokens to user
        tokenA.transfer(msg.sender, shareA);
        tokenB.transfer(msg.sender, shareB);
    }

    function swapAforB(uint256 x) external {
        require(x > 0, "Swap amount must be greater than zero");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        tokenA.transferFrom(msg.sender, address(this), x);

        // 0.3 % fee
        uint256 fee = (x * 3) / 1000;
        feeA += fee;
        uint256 xAfterFee = x - fee;
        require(x != xAfterFee, "Withdraw amount too small");
        // uint256 xAfterFee = x;

        // Calculate output amount y using constant product formula
        // y = reserveB - (k / (reserveA + xAfterFee)) = (xAfterFee * reserveB) / (reserveA + xAfterFee)
        uint256 y = (xAfterFee * reserveB) / (reserveA + xAfterFee);

        require(y > 0 && y < reserveB, "Invalid output amount");

        // Update reserves
        reserveA += xAfterFee;
        reserveB -= y;

        // Send TokenB to the user
        tokenB.transfer(msg.sender, y);
    }

    function swapBforA(uint256 y) external {
        require(y > 0, "Swap amount must be greater than zero");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        tokenB.transferFrom(msg.sender, address(this), y);

        uint256 fee = (y * 3) / 1000;
        feeB += fee;
        uint256 yAfterFee = y - fee;

        uint256 x = (yAfterFee * reserveA) / (reserveB + yAfterFee);

        require(x > 0 && x < reserveA, "Invalid output amount");

        reserveA -= x;
        reserveB += yAfterFee;
        tokenA.transfer(msg.sender, x);
    }

    function getPriceAinB() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return fixedDiv(reserveB, reserveA);
    }

    function getPriceBinA() external view returns (uint256) {
        if (reserveB == 0) return 0;
        return fixedDiv(reserveA, reserveB);
    }


    function min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }

    function fixedDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return (a * 10**DECIMALS) / b;
    }

    function fixedMul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y) / 10**DECIMALS;
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

}
