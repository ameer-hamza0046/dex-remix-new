const toWei = (val) => web3.utils.toWei(val.toString())
const fromWei = (val) => parseFloat(web3.utils.fromWei(val.toString()))
async function simulateDEX() {
    try {
        console.log('Starting DEX Simulation...')

        const accounts = await web3.eth.getAccounts()
        const deployer = accounts[0]

        // defining lPs, traders etc
        const lPs = accounts.slice(0, 5)
        const traders = accounts.slice(5, 13)
        const users = lPs.concat(traders)

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

        console.log('Deploying DEX...')
        const dex = await DEX.deploy({
            data: dexMeta.data.bytecode.object,
            arguments: [tokenA.options.address, tokenB.options.address],
        }).send({from: deployer, gas: 5000000})

        await tokenA.methods
            .approve(dex.options.address, toWei(totalBal))
            .send({from: deployer})
        await tokenB.methods
            .approve(dex.options.address, toWei(totalBal))
            .send({from: deployer})

        console.log('Distributing tokens to users...')
        const perUser = toWei(perUserBal)
        for (let i = 1; i < users.length; i++) {
            await tokenA.methods
                .transfer(accounts[i], perUser)
                .send({from: deployer})
            await tokenB.methods
                .transfer(accounts[i], perUser)
                .send({from: deployer})
            await tokenA.methods
                .approve(dex.options.address, toWei(totalBal))
                .send({from: accounts[i]})
            await tokenB.methods
                .approve(dex.options.address, toWei(totalBal))
                .send({from: accounts[i]})
        }

        console.log('LPs depositing initial liquidity...')
        for (let i = 0; i < lPs.length; i++) {
            const amtA = 150 + Math.floor(Math.random() * 50)
            const spotPrice = await dex.methods.getSpotPrice().call()
            const ratioAtoB = fromWei(spotPrice)
            const amtB =
                ratioAtoB !== 0
                    ? amtA / ratioAtoB
                    : 100 + Math.floor(Math.random() * 50)

            console.log(
                `[LP${i}: Deposit] ${amtA} A: Spot ${ratioAtoB} --> ${amtB} B`
            )

            await dex.methods.deposit(toWei(amtA), toWei(amtB)).send({
                from: lPs[i],
                gas: 500000,
            })
        }
        console.log('Setup Done!\n')
        console.log('Initial State:')
        await printBalance(dex)

        const N = 50 + Math.floor(Math.random() * 51) // choose a random N in [50, 100]
        // const N = 6 + Math.floor(Math.random() * 5)
        // const N = 50

        // ================== FOR METRICS ========================
        const reserveA_metric = []
        const reserveB_metric = []
        const tvl_metric = []
        const reserveRatio_metric = []
        const lp_balance_metric = [[], [], [], [], []]
        const swappedA_metric = []
        const swappedB_metric = []
        let swapA = 0,
            swapB = 0
        const feesA_metric = []
        const feesB_metric = []
        let feeA = 0,
            feeB = 0
        const spotPrice_metric = []
        const slippageA_metric = []
        const slippageB_metric = []
        let slippageA = 0,
            slippageB = 0
        // ================== FOR METRICS end ====================

        for (let i = 0; i < N; i++) {
            const action = ['swap', 'deposit', 'withdraw'][
                Math.floor(Math.random() * 3)
            ]
            console.log(`Action (${i + 1}/${N}): ${action}!`)
            const user =
                action === 'swap'
                    ? traders[Math.floor(Math.random() * traders.length)]
                    : lPs[Math.floor(Math.random() * lPs.length)]
            const balanceA = fromWei(
                await tokenA.methods.balanceOf(user).call()
            )
            const balanceB = fromWei(
                await tokenB.methods.balanceOf(user).call()
            )
            const lpBalance = fromWei(
                await dex.methods.lPTBalanceOf(user).call()
            )

            const reserveA = fromWei(await dex.methods.reserveA().call())
            const reserveB = fromWei(await dex.methods.reserveB().call())

            const spotPrice = fromWei(await dex.methods.getSpotPrice().call())
            if (action === 'swap') {
                if (Math.random() < 0.5 && balanceA > 0) {
                    const max = Math.min(balanceA, reserveA / 10)
                    const amt = Math.random() * max
                    await dex.methods
                        .swapAforB(toWei(amt))
                        .send({from: user, gas: 300000})
                    // metric ===
                    // new bal
                    const newbalanceA = fromWei(
                        await tokenA.methods.balanceOf(user).call()
                    )
                    const newbalanceB = fromWei(
                        await tokenB.methods.balanceOf(user).call()
                    )
                    const fee = fromWei(await dex.methods.feeA().call())
                    console.log(`Amount, fee: ${amt}, ${fee}`)
                    feeA = fee
                    swapA = amt

                    const expectedOut = amt / spotPrice
                    const actualOut = newbalanceB - balanceB

                    const alpha = actualOut / amt // (token Y received) / (token X deposited)
                    const beta = balanceB / balanceA // (token Y before swap) / (token X before swap)

                    const slip = ((alpha - beta) / beta) * 100
                    slippageA = slip

                    // metric end
                    // distribute the fees
                    console.log(
                        `[swap]: ${user.slice(0, 8)}... swapped ${amt} A.`
                    )
                } else if (balanceB > 0) {
                    const max = Math.min(balanceB, reserveB / 10)
                    const amt = Math.random() * max
                    await dex.methods
                        .swapBforA(toWei(amt))
                        .send({from: user, gas: 300000})
                    // metric ===
                    swapB = amt
                    const newbalanceA = fromWei(
                        await tokenA.methods.balanceOf(user).call()
                    )
                    const newbalanceB = fromWei(
                        await tokenB.methods.balanceOf(user).call()
                    )
                    const fee = fromWei(await dex.methods.feeB().call())
                    console.log(`Amount, fee: ${amt}, ${fee}`)
                    feeB = fee
                    const actualOut = newbalanceA - balanceA
                    const alpha = actualOut / amt
                    const beta = balanceA / balanceB
                    const slip = ((alpha - beta) / beta) * 100
                    slippageB = slip
                    slippageB_metric.push(slippageB)
                    // metric end
                    console.log(
                        `[swap]: ${user.slice(0, 8)}... swapped ${amt} B.`
                    )
                }
            } else if (action === 'deposit') {
                const amtA = Math.random() * balanceA
                const ratioAtoB = spotPrice
                const amtB = amtA / ratioAtoB
                await dex.methods
                    .deposit(toWei(amtA), toWei(amtB))
                    .send({from: user, gas: 500000})
                console.log(
                    `[deposit]: ${amtA} A + ${amtB} by ${user.slice(0, 8)}`
                )
            } else {
                const amtLP = Math.random() * lpBalance
                await dex.methods
                    .withdraw(toWei(amtLP))
                    .send({from: user, gas: 300000})
                console.log(`[withdraw]: ${amtLP} LPT by ${user.slice(0, 8)}`)
            }
            await printBalance(dex)

            // ========== GETTING METRICS ============
            const resA = fromWei(await dex.methods.reserveA().call())
            const resB = fromWei(await dex.methods.reserveB().call())
            // 1.1: reserveA
            reserveA_metric.push(resA)
            // 1.2: reserveB
            reserveB_metric.push(resB)
            // 1.2.5: TVL
            tvl_metric.push(resA + resB * spotPrice) // in terms of A
            // 1.3: ratio: resA/resB
            reserveRatio_metric.push(resB !== 0 ? resA / resB : 0)
            // 1.4: LP balance metric
            for (let i = 0; i < lPs.length; i++) {
                const bal = fromWei(
                    await dex.methods.lPTBalanceOf(lPs[i]).call()
                )
                lp_balance_metric[i].push(bal)
            }

            // 2.1: swapped_A
            swappedA_metric.push(swapA)
            swapA = 0 // reset
            // 2.2: swapped B
            swappedB_metric.push(swapB)
            swapB = 0 // reset
            // 2.3: fees_A
            feesA_metric.push(feeA)
            feeA = 0 // reset
            // 2.4: fees_B
            feesB_metric.push(feeB)
            feeB = 0 // reset
            // 3.1: spotPrice
            spotPrice_metric.push(spotPrice)
            // 3.2: Slippage_A
            slippageA_metric.push(slippageA)
            slippageA = 0
            // 3.3: Slippage_B
            slippageB_metric.push(slippageB)
            slippageB = 0

            // ========== GETTING METRICS end ========
        }
        console.log(`reserveA_metric ${reserveA_metric}`)
        console.log(`reserveB_metric ${reserveB_metric}`)
        console.log(`tvl_metric ${tvl_metric}`)
        console.log(`reserveRatio_metric ${reserveRatio_metric}`)
        console.log(`lp_balance_metric ${JSON.stringify(lp_balance_metric)}`)
        console.log(`swappedA_metric ${swappedA_metric}`)
        console.log(`swappedB_metric ${swappedB_metric}`)
        console.log(`feesA_metric ${feesA_metric}`)
        console.log(`feesB_metric ${feesB_metric}`)
        console.log(`spotPrice_metric ${spotPrice_metric}`)
        console.log(`slippageA_metric ${slippageA_metric}`)
        console.log(`slippageB_metric ${slippageB_metric}`)
    } catch (err) {
        console.error('❌ Error:', err.message)
    }
}

async function printBalance(dex) {
    const reserveA = await dex.methods.reserveA().call()
    const reserveB = await dex.methods.reserveB().call()
    const totalLPT = await dex.methods.reserveLPT().call()
    const spotPrice = await dex.methods.getSpotPrice().call()

    console.log(
        `Reserves: ${fromWei(reserveA)} A, ${fromWei(reserveB)} B, ${fromWei(
            totalLPT
        )} LPT, Spot Price: ${fromWei(spotPrice)}`
    )
}

simulateDEX()
