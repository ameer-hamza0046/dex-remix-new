const toWei = (val) => web3.utils.toWei(val.toFixed(18).toString())
const fromWei = (val) => parseFloat(web3.utils.fromWei(val.toString()))

async function simulateArbitrage() {
    try {
        console.log('Starting Arbitrage Simulation...')

        const accounts = await web3.eth.getAccounts()
        const deployer = accounts[0]
        const arb = accounts[1]
        const users = [deployer, arb]

        // initial balance
        const perUserBal = 1000
        const totalBal = users.length * perUserBal

        // Load ABIs
        const tokenMeta = JSON.parse(await remix.call('fileManager','getFile','browser/contracts/artifacts/Token.json'))
        const dexMeta = JSON.parse(await remix.call('fileManager','getFile','browser/contracts/artifacts/DEX.json'))
        const arbitrageMeta = JSON.parse(await remix.call('fileManager','getFile','browser/contracts/artifacts/Arbitrage.json'))

        // Classes
        const Token = new web3.eth.Contract(tokenMeta.abi)
        const DEX = new web3.eth.Contract(dexMeta.abi)
        const Arbitrage = new web3.eth.Contract(arbitrageMeta.abi)

        console.log('Deploying TokenA and TokenB...')
        const tokenA = await Token.deploy({data: tokenMeta.data.bytecode.object,arguments: ['TokenA', 'TKA', toWei(totalBal)],}).send({ from: deployer, gas: 5000000 })
        const tokenB = await Token.deploy({data: tokenMeta.data.bytecode.object,arguments: ['TokenB', 'TKB', toWei(totalBal)],}).send({ from: deployer, gas: 5000000 })

        console.log('Deploying dex1 and dex2...')
        const dex1 = await DEX.deploy({data: dexMeta.data.bytecode.object,arguments: [tokenA.options.address, tokenB.options.address],}).send({ from: deployer, gas: 5000000 })
        const dex2 = await DEX.deploy({data: dexMeta.data.bytecode.object,arguments: [tokenA.options.address, tokenB.options.address],}).send({ from: deployer, gas: 5000000 })

        console.log('Deploying arbitrage...')
        const arbitrage = await Arbitrage.deploy({data: arbitrageMeta.data.bytecode.object,arguments: [dex1.options.address, dex2.options.address],}).send({ from: deployer, gas: 5000000 })

        console.log('Approving dex1, dex2 and arbitrage...')
        await tokenA.methods.approve(dex1.options.address, toWei(totalBal)).send({ from: deployer })
        await tokenA.methods.approve(dex2.options.address, toWei(totalBal)).send({ from: deployer })
        await tokenA.methods.approve(arbitrage.options.address, toWei(totalBal)).send({ from: arb })

        await tokenB.methods.approve(dex1.options.address, toWei(totalBal)).send({ from: deployer })
        await tokenB.methods.approve(dex2.options.address, toWei(totalBal)).send({ from: deployer })
        await tokenB.methods.approve(arbitrage.options.address, toWei(totalBal)).send({ from: arb })

        console.log('Giving 1000 TKA and 1000 TKB to arb...')
        await tokenA.methods.transfer(arb, toWei(perUserBal)).send({ from: deployer })
        await tokenB.methods.transfer(arb, toWei(perUserBal)).send({ from: deployer })

        const deps = [400, 300, 350, 500]
        console.log('Deployer depositing for initial liquidity...')
        console.log(`Depositing ${deps[0]} TKA and ${deps[1]} TKB in DEX-1`)
        await dex1.methods.deposit(toWei(deps[0]), toWei(deps[1])).send({from: deployer, gas: 5000000,})
        console.log(`Depositing ${deps[2]} TKA and ${deps[3]} TKB in DEX-2`)
        await dex2.methods.deposit(toWei(deps[2]), toWei(deps[3])).send({from: deployer, gas: 5000000,})

        const amnts = [20, 2, 150, 50];
        for(let i=0; i<amnts.length; i++) {
            console.log(`Executing arbitrage${i+1}...`)
            await printSpotPrices(dex1, dex2);
            await executeArbitrage(tokenA, tokenB, arbitrage, arb, amnts[i]);
        }
        console.log('======= The End =======')
    } catch (err) {
        console.error('Arbitrage Failed:', err.message)
    }
}

async function executeArbitrage(tokenA, tokenB, arbitrage, arb, amt) {
    try {
        await arbitrage.methods.execute(toWei(amt)).send({from : arb, gas: 5000000});
        console.log("ARBITRAGE SUCCESSFUL!");
    } catch (err) {
        console.error("ARBITRAGE FAILED!");
    }
    let final_balA = fromWei(await tokenA.methods.balanceOf(arb).call())
    let final_balB = fromWei(await tokenB.methods.balanceOf(arb).call())
    console.log(`Balance: ${final_balA} TKA, ${final_balB} TKB`)
}

async function printSpotPrices(dex1, dex2) {
    const spot1 = fromWei(await dex1.methods.getSpotPrice().call());
    const spot2 = fromWei(await dex2.methods.getSpotPrice().call());

    console.log(`[DEX-1] Spot Price (A/B): ${spot1}`);
    console.log(`[DEX-2] Spot Price (A/B): ${spot2}`);
}

simulateArbitrage()

