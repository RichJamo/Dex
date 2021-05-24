const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');

contract("Dex", accounts => {
    //(1) when creating a SELL market order, the seller needs to have enough tokens for the trade
    //passed
    it ("should throw an error when creating a SELL market order without adequate token balance", async () => {
        let dex = await Dex.deployed() // what is this exactly doing?

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Initial LINK balance is not zero.")


        
        //add the LINK token to the dex
        //await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        //put a buy order into the order book
        //dex.depositEth({value:200}) ;
        //dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 20 ) //does it matter that this comes from us? don't think so

        //approve the dex to transfer 500 of the caller's LINK tokens
        //await link.approve(dex.address,500); 

        //attempt to place a sell market order when seller has no units of LINK in wallet balance - should revert
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10) //on selling, it's only the amount that is important here
        )
        
        //user deposits 100 link into their dex wallet from account 0 of the accounts created by truffle develop (1000 LINK minted for that account by token constructor)
        //await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]}); //why throwing an error?
        //console.log(dex.balances)
        
        //attempt to place a sell market order again, but now with sufficient balance of LINK in dex wallet
        //await truffleAssert.passes(
        //    dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10) //on selling, it's only the amount that is important here
        //)
    })

    //(2) when creating a BUY market order, the buyer needs to have enough ETH for the trade
    //no events were emitted
    it ("should only be possible for trader to put in a BUY market order up to the amount of eth he has", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        // do I need to set his ETH balance back to zero here? 
        
        //put a sell order into the order book
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 20 )

        //get the sell side order book
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        
        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), orderbook[0].amount) 
        )
        //figure out how much ETH the user would have to be holding to make a basic market order
        let ethNeeded = (orderbook[0].amount*orderbook[0].price);
        ethNeeded = ethNeeded*2;
        await dex.depositEth({value:ethNeeded}); //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), orderbook[0].amount)
        )
    })

    //(3) Market orders can be submitted even if the order book is empty
    //passed
    it ("should be possible to submit orders even if the order book is empty", async () => {
        let dex = await Dex.deployed(); //by deploying again do I ensure a 'clean slate', i.e. an empty orderbook?
        let link = await Link.deployed();
        //how can we ensure an empty order book initially? CHECK THIS
        //we have to cover the BUY case and SELL case separately

        //the BUY case:
        dex.depositEth({value:100}) //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10) //BUY market order
        )

        //the SELL case:
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]}); //why throwing an error?
        
        await truffleAssert.passes(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10) //SELL market order
        )
    })

    //(4) Market orders should be filled until the order book is empty or the market order is 100% filled
    //passed
    it ("should fill market orders until the order book is empty or the market order is 100% filled", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        //how can we ensure an empty order book initially?
        //we have to cover the BUY case and SELL case separately? or are there four cases??
        
        //the BUY case:
        dex.depositEth({value:100}) //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        //put a couple of limit orders into the sell side of the order book
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10 ) //BUY limit order
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 12 ) //BUY limit order

        //place a market order and get back the list of filled orders from that market order
        let amountFilled = dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 20) //SELL market order
        
        //check the updated status of our orderbook after our market order has been filled
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //get the BUY side of the order book
        
        //check that it's not the case that the order book is empty and the order is not totally filled
        assert(!((orderbook.length ==0) && (amountFilled != 20)));

        //the SELL case:
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]});
        
        //put a couple of limit orders into the buy side of the order book
        dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 10 ) //BUY limit order
        dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 8 ) //BUY limit order

        amountFilled = dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 20) //SELL market order

        //check the updated status of our orderbook after our market order has been filled
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //get the SELL side of the order book

        assert(!((orderbook.length ==0) && (amountFilled != 20)))
        //does this cover all cases?? covers when mkt order exceeds book.. I think we're ok..
    })
    //(5) The eth balance of the buyer should be decreased with the filled amount
    //assertion failed
    it ("should decrease the balance of the market order buyer by the filled amount", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        dex.depositEth({value:100}) //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        ethBalanceBefore = dex.getBalance(accounts[0], web3.utils.fromUtf8("ETH"));
        //create a SELL limit order for us to trade against
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10 ); //SELL limit order
        //place the market order
        let amountFilled = dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10) //BUY market order
        //figure out how much should have been spent

        let amountSpent = 0;
        let filledAmount = 0;
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //get the SELL side of the order book
        for (i = 0; i < orderbook.length && filledAmount < amountFilled; i++) {
            amountSpent = orderbook[i].price*orderbook[i].amount;
            filledAmount += orderbook[i].amount;
        }

        //track how much ETH the buyer has actually spent
        ethBalanceAfter = dex.getBalance(accounts[0], web3.utils.fromUtf8("ETH"));
        let ethDecrease = ethBalanceBefore - ethBalanceAfter;
        //compare the two
        assert(ethDecrease==amountSpent, "Eth decrease does not equal amount spent"); //unspecified assertion error??
    })

    //(6) The token balances of the limit order sellers should decrease with the filled amounts
    //assertion failed
    it ("should decrease the balances of the limit order sellers with the filled amounts", async () => { //could be multiple sellers!
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        dex.depositEth({value:100}) //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]}); //why throwing an error?
        
        //place a SELL limit order
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10 ); //BUY limit order
        //create the market order to buy
        let amountFilled = dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 20) //BUY market order

        let tokensSold = 100 - await dex.getBalance(accounts[0], web3.utils.fromUtf8("LINK"));

        assert(tokensSold==amountFilled, "Tokens sold does not equal amount filled");
    })
    
    //(7) Filled limit orders should be removed from the order book
    //assertion failed
    it ("should remove filled limit orders from the order book", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();  
        //deposit ETH into the buyers account
        dex.depositEth({value:100}) //why not await on this one? & is this enough Eth to be a good test? what if price is really high, might still fail?
        //deposit LINK into the sellers account
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[0]}); //why throwing an error?
        //create a sell limit order
        dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 10 ); //BUY limit order

        //check the amount of units for sale on the sell side of the order book
        let amountForSale = 0;
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        for (index in orderbook) {amountForSale += orderbook[index].amount}

        //place a buy market order for 10 LINK
        let amountFilled = dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10) //BUY market order

        //check the updated number of tokens now for sale on the sell side of the order book
        let newAmountForSale = 0;
        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        for (index in orderbook) {newAmountForSale += orderbook[index].amount}
        //check how many fewer tokens are now for sale on the sell side
        tokensRemoved = amountForSale - newAmountForSale;
        //check whether the two are the same (as they should be)
        assert(amountFilled == tokensRemoved, "Amount filled does not equal tokens removed");
    })
    //more tests?
})
