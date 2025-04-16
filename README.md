# dex-remix-new


## Arbitrage.sol

Contains the Arbitrage Contract Class and the functions required in it for the assignment.
### constructor
The constructor initializes the Arbitrage with two dex addresses.

### executeArbitrage
This functions executes the arbitrage for some fixed amount of tokens, checks both ways A to B and B to A for profit, and executes the arbitrage if profit exceeds the min profit (0.05 % of the total input amount).

## DEX.sol

Contains DEX class and functions required.
### constructor
initializes with token address tokenA and tokenB

### utility functions
defined some utility functions such as getspotprice, lPTBalanceOf, reserveLPT, getPriceAinB, getPriceBinA, min, fixedDiv, fixedMul, sqrt

### swapAtoB function
to swap tokenA for tokenB

### swapBtoA function
same as before but for B to Alt

### deposit function
to deposit tokenA and tokenB in the DEX and mint the LP tokens for the depositer

### withdraw function
take LPTokens from the withdrawer and give corresponding tokenA and tokenB to it.

## LPToken.sol
File contains contructor, burn and mint functions.
The burn and mint function can only be called by the DEX.

## Token.sol
Definition of the token class

## simulate_DEX.js
1. deploying the tokenA and tokenB
2. deploying the dex with their addresses
3. initialize users with initial balances
4. few initial deposits to set up the DEX
5. run some random number (50 to 100) of instructions (swap, deposit, withdraw)
6. print the metrics


## simulate_arbitrage.js
1. deploying the tokenA and tokenB
2. deploying the dex1 and dex2 with their addresses
3. initialize users with initial balances
4. few initial deposits to set up the DEX1 and DEX2
5. run few arbitrages showing two successful arbitrages, and two failed arbitrages


