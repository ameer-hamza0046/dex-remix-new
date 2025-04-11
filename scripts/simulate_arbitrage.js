const toWei = (val) => web3.utils.toWei(val.toFixed(18).toString())
const fromWei = (val) => parseFloat(web3.utils.fromWei(val.toString()))

async function simulateArbitrage() {
    try {
        console.log('Starting DEX Simulation...')

        const accounts = await web3.eth.getAccounts()
        const deployer = accounts[0]
        // defining lPs, traders etc
        const lPs = accounts.slice(0, 5)
        const traders = accounts.slice(5, 13)
        const users = lPs.concat(traders)

        const owner = traders[0]

        // initial balance
        const perUserBal = 1000
        const totalBal = users.length * perUserBal

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
        const arbitrageMeta = JSON.parse(
            await remix.call(
                'fileManager',
                'getFile',
                'browser/contracts/artifacts/arbitrage.json'
            )
        )
        const Token = new web3.eth.Contract(tokenMeta.abi)
        const DEX = new web3.eth.Contract(dexMeta.abi)

        console.log('Deploying TokenA...')
        const tokenA = await Token.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenA', 'TKA', toWei(totalBal)],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying TokenB...')
        const tokenB = await Token.deploy({
            data: tokenMeta.data.bytecode.object,
            arguments: ['TokenB', 'TKB', toWei(totalBal)],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying dex1...')
        const dex1 = await DEX.deploy({
            data: dexMeta.data.bytecode.object,
            arguments: [tokenA.options.address, tokenB.options.address],
        }).send({from: deployer, gas: 5000000})

        console.log('Deploying dex2...')
        const dex2 = await DEX.deploy({
            data: dexMeta.data.bytecode.object,
            arguments: [tokenA.options.address, tokenB.options.address],
        }).send({from: deployer, gas: 5000000})

        console.log('Approving dex1 and dex2...')
        await tokenA.methods
            .approve(dex1.options.address, toWei(totalBal))
            .send({from: deployer})
        await tokenB.methods
            .approve(dex1.options.address, toWei(totalBal))
            .send({from: deployer})
        await tokenA.methods
            .approve(dex2.options.address, toWei(totalBal))
            .send({from: deployer})
        await tokenB.methods
            .approve(dex2.options.address, toWei(totalBal))
            .send({from: deployer})

        console.log('Distributing tokens to users...')
        const perUser = toWei(perUserBal)
        for (let i = 1; i < users.length; i++) {
            if(users[i] == owner) console.log("This is owner...")
            await tokenA.methods
                .transfer(accounts[i], perUser)
                .send({from: deployer})
            await tokenB.methods
                .transfer(accounts[i], perUser)
                .send({from: deployer})
            await tokenA.methods
                .approve(dex1.options.address, toWei(totalBal))
                .send({from: accounts[i]})
            await tokenB.methods
                .approve(dex1.options.address, toWei(totalBal))
                .send({from: accounts[i]})
            await tokenA.methods
                .approve(dex2.options.address, toWei(totalBal))
                .send({from: accounts[i]})
            await tokenB.methods
                .approve(dex2.options.address, toWei(totalBal))
                .send({from: accounts[i]})
        }

        console.log('LPs depositing initial liquidity...')
        for (let i = 0; i < lPs.length; i++) {

            let amtA = 150 + Math.floor(Math.random() * 50)
            let ratioAtoB = fromWei(await dex1.methods.getSpotPrice().call())
            amtB =
                ratioAtoB !== 0
                    ? amtA / ratioAtoB
                    : 100 + Math.floor(Math.random() * 50)

            console.log(
                `[DEX-1][LP${i}: Deposit] ${amtA} A: Spot ${ratioAtoB} --> ${amtB} B`
            )

            await dex1.methods.deposit(toWei(amtA), toWei(amtB)).send({
                from: lPs[i],
                gas: 500000,
            })
            ////////////////////////////////////////////////
            amtA = 100 + Math.floor(Math.random() * 50)
            ratioAtoB = fromWei(await dex2.methods.getSpotPrice().call())
            amtB =
                ratioAtoB !== 0
                    ? amtA / ratioAtoB
                    : 150 + Math.floor(Math.random() * 50)

            console.log(
                `[DEX-2][LP${i}: Deposit] ${amtA} A: Spot ${ratioAtoB} --> ${amtB} B`
            )

            await dex2.methods.deposit(toWei(amtA), toWei(amtB)).send({
                from: lPs[i],
                gas: 500000,
            })
        }

        const Arbitrage = new web3.eth.Contract(arbitrageMeta.abi)

        // if spotRatio of dex1 < spotRatio of dex2
        // swap A for B (dex1) then B for A (dex2)
        // else
        // swap B for A (dex1) then B for A (dex2)

        console.log('Deploying Arbitrage Contract...')
        const arbitrage = await Arbitrage.deploy({
            data: arbitrageMeta.data.bytecode.object,
            arguments: [dex1.options.address, dex2.options.address],
        }).send({from: owner, gas: 3000000})

        console.log(
            `Arbitrage Contract deployed at: ${arbitrage.options.address}`
        )
        console.log('Setup Done!\n')

        console.log(
            `[dex-1] SpotPrice: ${fromWei(
                await dex1.methods.getSpotPrice().call()
            )}`
        )
        console.log(
            `[dex-2] SpotPrice: ${fromWei(
                await dex2.methods.getSpotPrice().call()
            )}`
        )

        const amount = 20
        const tokenA_start = fromWei(await tokenA.methods.balanceOf(owner).call())
        const tokenB_start = fromWei(await tokenB.methods.balanceOf(owner).call())
        console.log(`Token A: ${tokenA_start}, Token B: ${tokenB_start}`)
        await dex2.methods.swapAforB(toWei(amount)).send({ from: owner, gas: 300000 })
        
        const tokenA_mid = fromWei(await tokenA.methods.balanceOf(owner).call())
        const tokenB_mid = fromWei(await tokenB.methods.balanceOf(owner).call())
        console.log(`Token A: ${tokenA_mid}, Token B: ${tokenB_mid}`)


        await dex1.methods.swapBforA(toWei(tokenB_mid - tokenB_start)).send({ from: owner, gas: 300000 })
        const tokenA_end = fromWei(await tokenA.methods.balanceOf(owner).call())
        const tokenB_end = fromWei(await tokenB.methods.balanceOf(owner).call())
        console.log(`Token A: ${tokenA_end}, Token B: ${tokenB_end}`)
        console.log("done");
    } catch (err) {
        console.error('Arbitrage Failed:', err.message)
    }
}

simulateArbitrage()
