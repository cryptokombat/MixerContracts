require('dotenv').config()

import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'hardhat-tracer'
import 'solidity-coverage'

import { HardhatUserConfig } from 'hardhat/config'

const INFURA_API_KEY = process.env.INFURA_API_KEY || ''
const MAINNET_DEPLOYER_PK = process.env.MAINNET_DEPLOYER_PK || ''
const TESTNET_DEPLOYER_PK = process.env.TESTNET_DEPLOYER_PK || ''

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || ''
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || ''

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ''

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      saveDeployments: true,
      accounts: [MAINNET_DEPLOYER_PK],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      saveDeployments: true,
      accounts: [TESTNET_DEPLOYER_PK],
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      saveDeployments: true,
      accounts: [TESTNET_DEPLOYER_PK],
    },
    bsc: {
      url: `https://bsc-dataseed1.binance.org`,
      saveDeployments: true,
      accounts: [MAINNET_DEPLOYER_PK],
      //gasPrice: 6000000000,
    },
    bsctest: {
      url: `https://data-seed-prebsc-2-s3.binance.org:8545`,
      saveDeployments: true,
      accounts: [TESTNET_DEPLOYER_PK],
    },
    polygon: {
      url: `https://rpc-mainnet.maticvigil.com`,
      saveDeployments: true,
      accounts: [MAINNET_DEPLOYER_PK],
    },
    mumbai: {
      url: `https://rpc-mumbai.maticvigil.com`,
      saveDeployments: true,
      accounts: [TESTNET_DEPLOYER_PK],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
      4: 0,
    },
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
  gasReporter: {
    coinmarketcap: COINMARKETCAP_API_KEY,
    currency: 'USD',
    gasPrice: 100,
    enabled: false,
  },
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
}

export default config
