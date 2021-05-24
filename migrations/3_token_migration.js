const Link = artifacts.require("LINK");
//const Eth = artifacts.require("ETH");

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(Link);
};

//module.exports = async function (deployer, network, accounts) {
//  await deployer.deploy(Eth);
//};