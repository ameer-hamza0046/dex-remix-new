// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DEX.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Arbitrage {
    address public owner;
    DEX public dex1;
    DEX public dex2;
    IERC20 tokenA;
    IERC20 tokenB;

    uint256 public constant FEE_NUMERATOR = 3; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant minProfit = 1e18; // Minimum profit (e.g., 1 token)
    uint8 public constant DECIMALS = 18;

    constructor(address _dex1, address _dex2) {
        owner = msg.sender;
        dex1 = DEX(_dex1);
        dex2 = DEX(_dex2);
        tokenA = IERC20(address(dex1.tokenA()));
        tokenB = IERC20(address(dex1.tokenB()));
    }

    function execute(uint256 amountIn) external {
        require(amountIn > 0, "Input must be non-zero");

        uint256 spot1 = dex1.getSpotPrice(); // A/B from dex1
        uint256 spot2 = dex2.getSpotPrice(); // A/B from dex2
        // uint256 temp;

        if(spot1 <= spot2) {
            // path A -> B -> A
            // Calculate profit from A -> B -> A
            // deduct 0.3 % fees from amountIn
            // temp = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR;
            // // convert to TKB
            // temp = fixedDiv(temp, spot1);
            // // deduct 0.3 % fees again
            // temp = temp * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR;
            // // convert to TKA
            // temp = fixedMul(temp, spot2);
            // // find the profit
            // temp = temp - amountIn;
            // execute
            tokenA.transferFrom(msg.sender, address(this), amountIn);
            tokenA.approve(address(dex1), amountIn);
            dex1.swapAforB(amountIn);

            uint256 receivedB = tokenB.balanceOf(address(this));
            tokenB.approve(address(dex2), receivedB);
            dex2.swapBforA(receivedB);

            uint256 finalA = tokenA.balanceOf(address(this));
            require(finalA - amountIn > minProfit, "profit > minProfit failed");
            tokenA.transfer(msg.sender, finalA);
        } else {
            // path B -> A -> B
            // Calculate profit from B -> A -> B
            // deduct 0.3 % fees from amountIn
            // temp = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR;
            // // convert to TKA
            // temp = fixedMul(temp, spot1);
            // // deduct 0.3 % fees again
            // temp = temp * (FEE_DENOMINATOR - FEE_NUMERATOR) / FEE_DENOMINATOR;
            // // convert to TKB
            // temp = fixedDiv(temp, spot2);
            // // find the profit
            // temp = temp - amountIn;
            // require(temp > minProfit, "temp > minProfit failed");
            // execute
            tokenB.transferFrom(msg.sender, address(this), amountIn);
            tokenB.approve(address(dex1), amountIn);
            dex1.swapBforA(amountIn);

            uint256 receivedA = tokenA.balanceOf(address(this));
            tokenA.approve(address(dex2), receivedA);
            dex2.swapAforB(receivedA);

            uint256 finalB = tokenB.balanceOf(address(this));
            require(finalB - amountIn > minProfit, "profit > minProfit failed");
            tokenB.transfer(msg.sender, finalB);
        }
    }

    function fixedDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return (a * 10**DECIMALS) / b;
    }

    function fixedMul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y) / 10**DECIMALS;
    }
}
