import { BigNumber, utils } from 'ethers'
import { NomicLabsHardhatPluginError } from 'hardhat/plugins'
import { arrayRange } from './utils'

export enum NetworkID {
  MAINNET = 1,
  RINKEBY = 4,
  //GOERLI = 5,
  KOVAN = 42,
  // Binance Smart Chain
  BSC = 56,
  BSC_TESTNET = 97,
  // Huobi ECO Chain
  //HECO = 128,
  //HECO_TESTNET = 256,
  // Fantom mainnet
  //OPERA = 250,
  // Optimistim
  //OPTIMISTIC_ETHEREUM = 10,
  //OPTIMISTIC_KOVAN = 69,
  // Polygon
  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  // Arbitrum
  //ARBITRUM_ONE = 42161,
}

export enum HeroEdition {
  EMPTY,
  GENESIS,
  EPIC,
  RARE,
  COMMON,
}

export const COMMON_CONFIG = {
  editions: [HeroEdition.EPIC, HeroEdition.RARE, HeroEdition.COMMON],
  chances: [3700, 36600, 59700],
  //chances: [5000, 35000, 60000],
}
export const RARE_CONFIG = {
  editions: [HeroEdition.COMMON, HeroEdition.EPIC, HeroEdition.RARE],
  chances: [9700, 34700, 55600],
}

const collectionAddress: { [networkID in NetworkID]: string } = {
  [NetworkID.MAINNET]: '0x0',
  [NetworkID.RINKEBY]: '0xea0144115c9F722f26963aCC6d564Cee8Bd77F76',
  [NetworkID.KOVAN]: '0x0',
  [NetworkID.BSC]: '0x93e6f7264033dC2210919c4E3feE065313015109',
  [NetworkID.BSC_TESTNET]: '0x611477c54F8f2dA620Ea0A3B44729929c6C91a27',
  [NetworkID.POLYGON]: '0x0',
  [NetworkID.POLYGON_MUMBAI]: '0x9e96d6047308E07C331C2EcB7Acb538A3AAD493a',
}

const maxTokenId = 32

const allTokenIds = arrayRange(1, maxTokenId, 1)

const genesisTokenIds = arrayRange(1, maxTokenId, 4)

const epicTokenIds = arrayRange(2, maxTokenId, 4)

const rareTokenIds = arrayRange(3, maxTokenId, 4)

const commonTokenIds = arrayRange(4, maxTokenId, 4)

const maxTokens = [1, 1000, 1000, 1000]
const initialTokens = [0, 300, 300, 300]

const maxArray = Array.from({ length: maxTokenId / maxTokens.length }, () => maxTokens).flat()
const initialArray = Array.from({ length: maxTokenId / maxTokens.length }, () => initialTokens).flat()

export const createTokenArgs = {
  maxArray,
  initialArray,
}

type TokenMapping = {
  [key in HeroEdition]: number[]
}

const polygonTokenEditionMapping: TokenMapping = {
  [HeroEdition.EMPTY]: allTokenIds,
  [HeroEdition.GENESIS]: genesisTokenIds,
  [HeroEdition.EPIC]: epicTokenIds,
  [HeroEdition.RARE]: rareTokenIds,
  [HeroEdition.COMMON]: commonTokenIds,
}

// BSC PROD
const bscTokenEditionMapping: TokenMapping = {
  [HeroEdition.EMPTY]: [...arrayRange(1, 38, 1)],
  [HeroEdition.GENESIS]: [...arrayRange(1, 28, 4), 32, 36],
  [HeroEdition.EPIC]: [...arrayRange(2, 28, 4), 33, 37],
  [HeroEdition.RARE]: [...arrayRange(3, 28, 4), 34, 38],
  [HeroEdition.COMMON]: [...arrayRange(4, 28, 4), 35, 39],
}
// BSC UAT
const bscTestTokenEditionMapping: TokenMapping = {
  [HeroEdition.EMPTY]: [...arrayRange(1, 38, 1)],
  [HeroEdition.GENESIS]: [...arrayRange(1, 28, 4), 32, 39],
  [HeroEdition.EPIC]: [...arrayRange(2, 28, 4), 33, 40],
  [HeroEdition.RARE]: [...arrayRange(3, 28, 4), 34, 41],
  [HeroEdition.COMMON]: [...arrayRange(4, 28, 4), 35, 42],
}

export const testTokenEditionMapping: TokenMapping = {
  [HeroEdition.EMPTY]: [...arrayRange(1, 38, 1)],
  [HeroEdition.GENESIS]: [...arrayRange(1, 28, 4), 32],
  [HeroEdition.EPIC]: [...arrayRange(2, 28, 4), 33],
  [HeroEdition.RARE]: [...arrayRange(3, 28, 4), 34],
  [HeroEdition.COMMON]: [...arrayRange(4, 28, 4), 35],
}

const tokenMappingByChain: { [networkID in NetworkID]: TokenMapping | undefined } = {
  [NetworkID.MAINNET]: undefined,
  [NetworkID.RINKEBY]: undefined,
  [NetworkID.KOVAN]: undefined,
  [NetworkID.BSC]: bscTokenEditionMapping,
  [NetworkID.BSC_TESTNET]: bscTestTokenEditionMapping,
  [NetworkID.POLYGON]: undefined,
  [NetworkID.POLYGON_MUMBAI]: polygonTokenEditionMapping,
}

export interface MixerConfig {
  editions: HeroEdition[]
  chances: number[]
}

export const mixerConfig: { [editionId in HeroEdition]: MixerConfig | undefined } = {
  [HeroEdition.EMPTY]: undefined,
  [HeroEdition.GENESIS]: undefined,
  [HeroEdition.EPIC]: undefined,
  [HeroEdition.RARE]: RARE_CONFIG,
  [HeroEdition.COMMON]: COMMON_CONFIG,
}

export async function getTokenMapping(networkId: string): Promise<TokenMapping | undefined> {
  const chainID = parseInt(networkId) as NetworkID

  const mapping = tokenMappingByChain[chainID]

  if (mapping === undefined) {
    throw new NomicLabsHardhatPluginError('Token Mapping', `The token mapping could not be found for this network. ChainID: ${chainID}.`)
  }

  return mapping
}

export async function getCollectionAddress(networkId: string): Promise<string> {
  const chainID = parseInt(networkId) as NetworkID

  const address = collectionAddress[chainID]

  if (address === undefined) {
    throw new NomicLabsHardhatPluginError(
      'Collection Address',
      `The collection address could not be found for this network. ChainID: ${chainID}.`
    )
  }

  return address
}

export interface ChainlinkConfig {
  link: string
  coordinator: string
  keyhash: string
  fee: BigNumber
}

const networkIDtoConfig: { [networkID in NetworkID]: ChainlinkConfig } = {
  [NetworkID.MAINNET]: {
    link: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    coordinator: '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952',
    keyhash: '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445',
    fee: utils.parseUnits('2'),
  },
  [NetworkID.RINKEBY]: {
    link: '0x01BE23585060835E02B77ef475b0Cc51aA1e0709',
    coordinator: '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B',
    keyhash: '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311',
    fee: utils.parseUnits('0.1'),
  },
  [NetworkID.KOVAN]: {
    link: '0xa36085F69e2889c224210F603D836748e7dC0088',
    coordinator: '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9',
    keyhash: '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    fee: utils.parseUnits('0.1'),
  },
  [NetworkID.BSC]: {
    link: '0x404460C6A5EdE2D891e8297795264fDe62ADBB75',
    coordinator: '0x747973a5A2a4Ae1D3a8fDF5479f1514F65Db9C31',
    keyhash: '0xc251acd21ec4fb7f31bb8868288bfdbaeb4fbfec2df3735ddbd4f7dc8d60103c',
    fee: utils.parseUnits('0.2'),
  },
  [NetworkID.BSC_TESTNET]: {
    link: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06',
    coordinator: '0xa555fC018435bef5A13C6c6870a9d4C11DEC329C',
    keyhash: '0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186',
    fee: utils.parseUnits('0.1'),
  },
  [NetworkID.POLYGON]: {
    link: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1',
    coordinator: '0x3d2341ADb2D31f1c5530cDC622016af293177AE0',
    keyhash: '0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da',
    fee: utils.parseUnits('0.0001'),
  },
  [NetworkID.POLYGON_MUMBAI]: {
    link: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
    coordinator: '0x8C7382F9D8f56b33781fE506E897a4F1e2d17255',
    keyhash: '0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4',
    fee: utils.parseUnits('0.0001'),
  },
}

export async function getChainlinkConfig(networkId: string): Promise<ChainlinkConfig> {
  const chainID = parseInt(networkId) as NetworkID

  const config = networkIDtoConfig[chainID]

  if (config === undefined) {
    throw new NomicLabsHardhatPluginError(
      'Chainlink Configuration',
      `The chainlink config could not be found for this network. ChainID: ${chainID}.`
    )
  }

  return config
}
