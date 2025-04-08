async function simulateDEX() {
    try {
        console.log('🚀 Starting DEX Simulation...')

        const accounts = await web3.eth.getAccounts()
        const deployer = accounts[0]

        // Load ABIs
        const tokenMeta = JSON.parse(
            await remix.call(
                'fileManager',
                'getFile',
                'browser/contracts/artifacts/Token.json'
            )
        )
        const dexMeta = JSON.parse(
            await remix.call(
                'fileManager',
                'getFile',
                'browser/contracts/artifacts/DEX.json'
            )
        )

        const Token_Class = new web3.eth.Contract(tokenMeta.abi)
        const DEX_Class = new web3.eth.Contract(dexMeta.abi)

        console.log('Deploying TokenA...')
        const tokenA = await Token_Class.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenA', 'TKA', web3.utils.toWei('10000')],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying TokenB...')
        const tokenB = await Token_Class.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenB', 'TKB', web3.utils.toWei('10000')],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying DEX...')
        const dex = await DEX_Class.deploy({
            data: dexMeta.data.bytecode.object,
            arguments: [tokenA.options.address, tokenB.options.address],
        }).send({from: deployer, gas: 5000000})

        console.log('Approving DEX...')
        await tokenA.methods
            .approve(dex.options.address, web3.utils.toWei('10000'))
            .send({from: deployer})
        await tokenB.methods
            .approve(dex.options.address, web3.utils.toWei('10000'))
            .send({from: deployer})

        console.log('Setup Done!\n')
        console.log('Initial State')
        await printBalance(tokenA, tokenB, dex, accounts)

        console.log('Deployer depositing 200A and 300B')
        await dex.methods
            .deposit(web3.utils.toWei('200'), web3.utils.toWei('300'))
            .send({from: deployer})
        await printBalance(tokenA, tokenB, dex, accounts)

        console.log('Deployer depositing 100A and 150B')
        await dex.methods
            .deposit(web3.utils.toWei('100'), web3.utils.toWei('150'))
            .send({from: deployer})
        await printBalance(tokenA, tokenB, dex, accounts)

        console.log('Deployer swaps 50A')
        await dex.methods
            .swapAforB(web3.utils.toWei('50'))
            .send({from: deployer})
        await printBalance(tokenA, tokenB, dex, accounts)

        console.log('Deployer withdraws 0.5LPT')
        await dex.methods
            .withdraw(web3.utils.toWei('0.5'))
            .send({from: deployer})
        await printBalance(tokenA, tokenB, dex, accounts)
    } catch (err) {
        console.error('❌ Error:', err.message)
    }
}

async function printBalance(tokenA, tokenB, dex, accounts) {
    const deployer = accounts[0]
    console.log(
        'Deployer: ' +
            web3.utils
                .fromWei(await tokenA.methods.balanceOf(deployer).call())
                .toString() +
            'A, ' +
            web3.utils
                .fromWei(await tokenB.methods.balanceOf(deployer).call())
                .toString() +
            'B, ' +
            web3.utils
                .fromWei(await dex.methods.lPTBalanceOf(deployer).call())
                .toString() +
            'LPT | Reserves: ' +
            web3.utils.fromWei(await dex.methods.reserveA().call()).toString() +
            'A, ' +
            web3.utils.fromWei(await dex.methods.reserveB().call()).toString() +
            'B, ' +
            web3.utils
                .fromWei(await dex.methods.reserveLPT().call())
                .toString() +
            'LPT | Spot Price: ' +
            web3.utils.fromWei(await dex.methods.getSpotPrice().call()).toString()
    )
}

simulateDEX()
