//The user must have ETH deposited such that eth >= buy order value
//The user must have enough tokens deposited such that token balnce >= sell order amount
//The BUY order book should be ordered on price from highest to lowest starting at index 0
//The SELL order book should be ordered on price from lowest to highest starting at index 0?

const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link")
//const Eth = artifacts.require("Eth")
const truffleAssert = require('truffle-assertions');
//Side side, bytes32 ticker, uint amount, uint price

contract.skip("Dex", accounts => {
    it ("should only be possible for trader to put in a BUY order up to the amount of eth he has", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        //let eth = await Eth.deployed();
        
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 20 ) //10 @ price 20 = 200 eth
        )
        //await dex.addToken(web3.utils.fromUtf8("LINK"), link.address);
        //await dex.addToken(web3.utils.fromUtf8("ETH"), eth.address);
        dex.depositEth({value:100}) //dex.deposit(100, web3.utils.fromUtf8("ETH")); //why not await on this one?
        
        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 10 ) //10 @ price 10 = 100 eth
        )
    })

    it ("user should have enough tokens deposited s t token balance >= sell order amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10) //on selling, it's only the amount that is important here
        )
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]}); //of the 1000 LINK originally minted to the msg.sender, we deposit 100 into the user's dex wallet
        //console.log(dex.balances)
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10) //on selling, it's only the amount that is important here
        )
        
    })

    it ("should have a BUY order book ordered on price from highest to lowest starting at index 0", async () => { //before and after creating a limit order
        let dex = await Dex.deployed() //what if orderbook is empty??
        let link = await Link.deployed()
        
        await link.approve(dex.address, 100);
        await dex.depositEth({value: 3000});
        //let eth = await Eth.deployed()
        //await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)
        //await dex.addToken(web3.utils.fromUtf8("ETH"), eth.address)
        //await dex.deposit(100, web3.utils.fromUtf8("ETH"));
        
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 10);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 30);
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 20);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 50);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 40);
        
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook.length > 0);
        console.log(orderbook);
        for (let i = 0; i < orderbook.length - 1; i++) {
            assert(orderbook[i].price >= orderbook[i+1].price, "not right order in buy book");
        }
    })

    it ("should have a SELL order book ordered on price from lowest to highest starting at index 0", async () => { //is this right?
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        //await dex.addToken(web3.utils.fromUtf8("LINK"), link.address);
        //await dex.deposit(100, web3.utils.fromUtf8("LINK")); //why does he not have this line in his code??
        await link.approve(dex.address, 1000);

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 30);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 20);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 50);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 40);

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length > 0); //what's the difference between assert and truffleassert?
        console.log(orderbook);
        for (let i = 0; i < orderbook.length - 1; i++) {
            assert(orderbook[i].price <= orderbook[i+1].price, "not right order in sell book");
        }
    })
})

