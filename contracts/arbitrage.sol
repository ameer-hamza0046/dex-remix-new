// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DEX.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Arbitrage {
    address public owner;
    DEX public dex1;
    DEX public dex2;

    uint256 public constant FEE_PERCENT = 3; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant MIN_PROFIT = 1e16; // Minimum profit (e.g., 0.01 token)

    constructor(address _dex1, address _dex2) {
        owner = msg.sender;
        dex1 = DEX(_dex1);
        dex2 = DEX(_dex2);
    }

    function executeArbitrage(uint256 amountIn, bool directionAtoB) external {
        require(amountIn > 0, "Amount must be > 0");

        address tokenA = address(dex1.tokenA());
        address tokenB = address(dex1.tokenB());

        if (directionAtoB) {
            // A -> B on dex1
            IERC20(tokenA).transferFrom(msg.sender, address(this), amountIn);
            dex1.swapAforB(amountIn);

            uint256 receivedB = IERC20(tokenB).balanceOf(address(this));

            // B -> A on dex2
            IERC20(tokenB).approve(address(dex2), receivedB);
            dex2.swapBforA(receivedB);

            uint256 finalAmountA = IERC20(tokenA).balanceOf(address(this));
            uint256 profit = finalAmountA > amountIn ? finalAmountA - amountIn : 0;
            require(profit > MIN_PROFIT, "No profitable arbitrage");

            IERC20(tokenA).transfer(msg.sender, finalAmountA);
        } else {
            // B -> A on dex1
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenB).approve(address(dex1), amountIn);
            dex1.swapBforA(amountIn);

            uint256 receivedA = IERC20(tokenA).balanceOf(address(this));

            // A -> B on dex2
            IERC20(tokenA).approve(address(dex2), receivedA);
            dex2.swapAforB(receivedA);

            uint256 finalAmountB = IERC20(tokenB).balanceOf(address(this));
            uint256 profit = finalAmountB > amountIn ? finalAmountB - amountIn : 0;
            require(profit > MIN_PROFIT, "No profitable arbitrage");

            IERC20(tokenB).transfer(msg.sender, finalAmountB);
        }
    }
}
