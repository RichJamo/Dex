pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";
import  "./wallet.sol";

contract Dex is Wallet {

    using SafeMath for uint256;

    //create this enum variable for what type of order it is
    enum Side {
        BUY, //corresponds to 0
        SELL //corresponds to 1
    }

//create this struct for orders
    struct Order {
        uint id; //an id number for the order
        address trader; //the trader who is putting in the order, I assume..
        Side side;
        bytes32 ticker; //what ticker am i buying
        uint amount;
        uint price;
        uint filled;
    }

    struct filledOrder {
        uint amount;
        uint price;
    }

    //this variable counts up with each order so that we can assign unique id's to each order
    uint public nextOrderId = 0; //don't really have to write the zero in, but have for clarity
    filledOrder[] _filledOrders; //don't I have to then set this to zero each time?

    //for each asset, have two order books, one for each side (buy/sell)
    mapping(bytes32 => mapping(uint => Order[])) public orderBook; //should it be Side, not uint??

    //just returns the order book for a specified token and side (buy or sell)
    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory) {
        return orderBook[ticker][uint(side)];
    }

    //function to create a limit order - from a particular sender
    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public  { // we don't add market orders, they just take out of the book
        //checks
        if (side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= SafeMath.mul(amount, price), "Insufficent ETH to place buy order");
        }
        else if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Insufficient of that ticker to place sell order");
        }

        //create a temporary list of all of the orders on one side of the market, and add our new limit order
        Order[] storage orders = orderBook[ticker][uint(side)]; //list of orders - all buy or sell
        orders.push(
            Order(nextOrderId,msg.sender, side, ticker, amount, price, 0)
        );

        //Bubble sort the order list to get our new order into the right position
        if(side == Side.BUY){
            for (uint i = orders.length-1; i >=1; i--) {
                if (orders.length <= 1) {
                    break;
                    }
                else if (orders[i].price > orders[i-1].price) {
                    Order memory placeholder = orders[i-1];
                    orders[i-1] = orders[i];
                    orders[i] = placeholder;
                }
            }
        }
        if(side == Side.SELL) {
            for (uint i = orders.length-1; i >=1; i--) {
                if (orders.length <= 1) {
                    break;
                    }
                else if (orders[i].price < orders[i-1].price) {
                    Order memory placeholder = orders[i-1];
                    orders[i-1] = orders[i];
                    orders[i] = placeholder;
                }
            }
        }

        nextOrderId++; //increase the order ID counter
    }

    //function for creating a new market order
    function createMarketOrder(Side side, bytes32 ticker, uint amount) public payable returns (uint) {
        if (side == Side.SELL) require (balances[msg.sender][ticker] > amount, "Insufficient balance");
        
        uint orderBookSide;
        if (side == Side.BUY){
            orderBookSide = 1;
        }
        else if(side == Side.SELL){
            orderBookSide = 0;
        }

        Order[] storage orders = orderBook[ticker][orderBookSide];
        uint totalFilled;

        //I think what I've done below is just the BUY side - double check? and can I do sell side within it? or does it need to be separate?
        for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
            uint leftToFill = amount.sub(totalFilled); //how much is left to fill of the original order
            uint availableToFill = orders[i].amount.sub(orders[i].filled);
            uint filled = 0;
            
            if (availableToFill > leftToFill) {
                filled = leftToFill; //fill the entire market order
            }
            else {
                filled = availableToFill;//fill as much as is available in order i
            }
            
            uint cost = filled*orders[i].price;

            address buyerOfLink;
            address sellerOfLink;
            if (side == Side.BUY) {
                //check
                require (balances[msg.sender]["ETH"] >= filled.mul(orders[i].price), "Insufficient ETH to complete order");
                buyerOfLink = msg.sender;
                sellerOfLink = orders[i].trader;
                //the buyer's ETH balance goes down and their LINK balance goes up
                balances[msg.sender]["ETH"] -= cost;
                balances[msg.sender][ticker] += filled;
                
                //the seller's ETH balance goes up and LINK balance goes down
                balances[orders[i].trader]["ETH"] += cost;   
                balances[orders[i].trader][ticker] -= filled;
            }
            else {
                //the buyer's ETH balance goes down and their LINK balance goes up
                balances[orders[i].trader]["ETH"] -= cost;
                balances[orders[i].trader][ticker] += filled;
                
                //the seller's ETH balance goes up and LINK balance goes down
                balances[msg.sender]["ETH"] += cost;   
                balances[msg.sender][ticker] -= filled;
            }
            totalFilled= totalFilled.add(filled);
            orders[i].filled = orders[i].filled.add(filled);
             

            //effects
            

        }
        //Remove 100% filled orders from the orderbook
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            //Remove the top element in the orders array by overwriting every element
            // with the next element in the order list
            for (uint256 i = 0; i < orders.length - 1; i++) {
                orders[i] = orders[i + 1];
            }
            orders.pop();
        }
        return totalFilled;
        
    }
    
}