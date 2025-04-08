// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPToken is ERC20 {
    address public dex;

    constructor(address _dex) ERC20("LPToken", "LPT") {
        dex = _dex;
    }

    function mint(address to, uint256 amount) external  {
        require(msg.sender == dex, "Only DEX can mint LP tokens");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == dex, "Only DEX can burn LP tokens");
        _burn(from, amount);
    }
}
