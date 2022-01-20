const Pledge = artifacts.require("Pledge");
const fetch = require("node-fetch");
const { execSync } = require("child_process");
const web3Utils = require("web3-utils");

// Input params ///
const ERC20_TOKEN_CONTRACT_ADDRESS =
  "0xfecec059C7a23b30291e7d154823fcf30a4E3398"; // Pledge on Ropsten

const lockingPeriod = 10 * 60; // 10 minutes

const purpose = "No time";

//////////////////

const queryGasPrice = async () => {
  return new Promise((resolve, reject) => {
    fetch("https://ethgasstation.info/json/ethgasAPI.json", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        const gasPriceData = Number(json.fast) / 10; // Gwei

        console.log(`Queried gas price: ${gasPriceData} Gwei`);
        resolve(Number(gasPriceData) * 10 ** 9);

        // Only for test
        // resolve(2000000000);
      })
      .catch((err) => {
        console.log(err);
        resolve(null);
      });
  });
};

const networkIdName = {
  1: "ethmainnet",
  3: "ropsten",
  97: "bsctestnet",
  56: "bscmainnet",
};

const verifyCmd = (contractName, contractAddr, networkName) => {
  return `npx truffle run verify ${contractName}@${contractAddr} --network ${networkName}`;
};

// Verify and publish to etherscan
const execVerifyCmd = (contractName, contractAddr, networkName) => {
  // Ganache case
  if (!networkName) {
    return;
  }

  let RETRIES = 5;

  try {
    execSync(verifyCmd(contractName, contractAddr, networkName));
  } catch (err) {
    while (RETRIES > 0) {
      RETRIES--;
      try {
        execSync(verifyCmd(contractName, contractAddr, networkName));
        return;
      } catch (err2) {}
    }

    console.log(
      `Cannot publish contractName:${contractName}, contractAddr:${contractAddr} `
    );
    console.log("Error:", err);
  }
};

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    const networkId = await web3.eth.net.getId();
    const networkName = networkIdName[networkId];

    const deployerAccount = accounts[0];

    const oriBalance = await web3.eth.getBalance(deployerAccount);

    console.log(`Pledge deployment started at ${new Date()}`);

    console.log(
      `Deployer account: ${deployerAccount}, balance: ${web3.utils.fromWei(
        oriBalance
      )} ETH`
    );

    let opts = {
      from: deployerAccount,
    };

    if (networkName === "ethmainnet") {
      const gasPrice = await queryGasPrice();

      opts = {
        ...opts,
        gasPrice,
      };
    }

    // Deploy Pledge
    const PledgeContract = await deployer.deploy(
      Pledge,
      ERC20_TOKEN_CONTRACT_ADDRESS,
      lockingPeriod,
      purpose,
      opts
    );

    // Verify and publish to etherscan
    execVerifyCmd("Pledge", PledgeContract.address, networkName);

    console.log(`Pledge deployment ended at ${new Date()}`);
  });
};
