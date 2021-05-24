pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol"; //we need this interface so that we know how to interact with ERC20 tokens
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol"; 
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol"; 

contract Wallet is Ownable {
    using SafeMath for uint256;

    //tokens will be represented by this struct
    struct Token{
        bytes32 ticker;
        address tokenAddress;
    }

    //mapping from token ticker to token struct, plus an array containing all token tickers that the wallet contains
    mapping (bytes32 => Token) public tokenMapping;
    bytes32[] public tokenList;

    //mapping from wallet user's address -> token ticker -> balance they hold in that token (we use bytes32 for ticker rather than string so we can compare)
    mapping (address => mapping(bytes32 => uint256)) public balances; 

    //checks that the token has been added to the wallet by checking that it doesn't point to the zero address
    modifier tokenExist(bytes32 ticker) {
        require(tokenMapping[ticker].tokenAddress != address(0), "Token does not exist");
        _;
    }

    //add a token to the wallet
    function addToken(bytes32 ticker, address tokenAddress) onlyOwner external {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    //deposits an amount of a specified token from the sender into the wallet - NEED TO MODIFY AND NEATEN UP!
    function deposit(uint amount, bytes32 ticker) tokenExist(ticker) external { //
        //checks
        //require(IERC20(tokenMapping[ticker].tokenAddress).balanceOf(msg.sender) >= amount); //require that depositor has sufficient funds 

        //effects
        
        //interactions
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount); //we send tokens from the user address to the wallet address - how do we get permission?
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount); //change the balance of this user
    }

    //withdraws a certain amount of a specified token from the wallet to the sender (caller?)
    function withdraw(uint amount, bytes32 ticker) tokenExist(ticker) external {
        //checks
        require (balances[msg.sender][ticker] >= amount, "Balance not sufficient");

        //effects
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount); //change the balance of this user
        
        //interactions
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount); //we send tokens back from the wallet address to the user address (msg.sender)
    }

    //a special function for depositing ETH (the native token) as opposed to any other ERC20 token - this looks like a play function, but then why is it payable??
    function depositEth() payable external {
        balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(msg.value);
    }
    
    //a special function for withdrawing ETH from the wallet back to the sender/caller
    function withdrawEth(uint amount) external {
        //checks
        require(balances[msg.sender][bytes32("ETH")] >= amount,'Insufficient balance'); 
        //effects
        balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].sub(amount);
        msg.sender.call{value:amount}(""); //not sure what this does??
    }

    function getTokenList() view public returns (bytes32[] memory) {
        return tokenList;
    }

    function getBalance(address owner, bytes32 ticker) view public returns (uint) { //should I put 'virtual' in here? why? should I specify memory or callback for uint? why?
        return balances[owner][ticker];
    }
}