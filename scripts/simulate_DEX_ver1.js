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

        const decimals = 18

        console.log('Deploying TokenA...')
        const tokenA = await Token_Class.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenA', 'TKA', web3.utils.toWei('200')],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying TokenB...')
        const tokenB = await Token_Class.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenB', 'TKB', web3.utils.toWei('300')],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying DEX...')
        const dex = await DEX_Class.deploy({
            data: dexMeta.data.bytecode.object,
            arguments: [tokenA.options.address, tokenB.options.address],
        }).send({from: deployer, gas: 5000000})
        console.log('DEX done')

        // approve
        await tokenA.methods
            .approve(dex.options.address, web3.utils.toWei('200'))
            .send({from: deployer})
        await tokenB.methods
            .approve(dex.options.address, web3.utils.toWei('300'))
            .send({from: deployer})

        let balA = await tokenA.methods.balanceOf(deployer).call()
        let balB = await tokenB.methods.balanceOf(deployer).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        console.log(
            'SpotPrice',
            web3.utils.fromWei(await dex.methods.getSpotPrice().call())
        )

        await dex.methods
            .deposit(web3.utils.toWei('10'), web3.utils.toWei('20'))
            .send({from: deployer})

        balA = await tokenA.methods.balanceOf(deployer).call()
        balB = await tokenB.methods.balanceOf(deployer).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        balA = await tokenA.methods.balanceOf(dex.options.address).call()
        balB = await tokenB.methods.balanceOf(dex.options.address).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        console.log(
            'SpotPrice',
            web3.utils.fromWei(await dex.methods.getSpotPrice().call())
        )
        console.log(
            'LPTokens: ',
            web3.utils.fromWei(
                await dex.methods.getMyLPTokenCount(deployer).call()
            )
        )
        console.log('checkpoint1: deployer transfers 10A and 20B to Dex, receives 2LPT')

        await dex.methods
            .deposit(web3.utils.toWei('1'), web3.utils.toWei('2'))
            .send({from: deployer})

        balA = await tokenA.methods.balanceOf(deployer).call()
        balB = await tokenB.methods.balanceOf(deployer).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        balA = await tokenA.methods.balanceOf(dex.options.address).call()
        balB = await tokenB.methods.balanceOf(dex.options.address).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        console.log(
            'SpotPrice',
            web3.utils.fromWei(await dex.methods.getSpotPrice().call())
        )
        console.log(
            'LPTokens: ',
            web3.utils.fromWei(
                await dex.methods.getMyLPTokenCount(deployer).call()
            )
        )
        console.log('checkpoint2: deployers transfers 1A and 2B to Dex, gets 0.2 LPT')
        
        await dex.methods
            .withdraw(web3.utils.toWei('1.5'))
            .send({from: deployer})
        
        balA = await tokenA.methods.balanceOf(deployer).call()
        balB = await tokenB.methods.balanceOf(deployer).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        balA = await tokenA.methods.balanceOf(dex.options.address).call()
        balB = await tokenB.methods.balanceOf(dex.options.address).call()
        console.log(web3.utils.fromWei(balA))
        console.log(web3.utils.fromWei(balB))

        console.log(
            'SpotPrice',
            web3.utils.fromWei(await dex.methods.getSpotPrice().call())
        )
        console.log(
            'LPTokens: ',
            web3.utils.fromWei(
                await dex.methods.getMyLPTokenCount(deployer).call()
            )
        )
        console.log('checkpoint3: deployers withdraws 1.5LPT, gets 7.5A and 15B')
    } catch (err) {
        console.error('❌ Error:', err.message)
    }
}

simulateDEX()
