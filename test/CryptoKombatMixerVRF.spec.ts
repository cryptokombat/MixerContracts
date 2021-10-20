import { expect } from './chai-setup'
import hre, { getNamedAccounts, getUnnamedAccounts, ethers } from 'hardhat'

import { ContractReceipt } from 'ethers'
import { Address } from 'hardhat-deploy/types'

import { TestERC1155 } from '../typechain/TestERC1155'
import { CryptoKombatMixer } from '../typechain/CryptoKombatMixer'
import { getEvent } from './shared/utilities'
import { createTokenArgs, HeroEdition, mixerConfig, testTokenEditionMapping } from '../src/config'
import { CryptoKombatMixerVRF, TestERC223 } from '../typechain'

const commonMixArray = testTokenEditionMapping[HeroEdition.COMMON].slice(0, 3)
const rareMixArray = testTokenEditionMapping[HeroEdition.RARE].slice(0, 3)
const epicMixArray = testTokenEditionMapping[HeroEdition.EPIC].slice(0, 3)

const totalHits = 200
const expectedDeviation = (100 / totalHits) * 10 // 10% from total hits

const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

const fee = ethers.utils.parseEther('0.1')
const keyHash = '0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186'

context('CryptoKombatMixer', () => {
  let deployer: Address
  let notAdmin: Address
  let coordinator: Address
  let wallet2: Address
  let wallet3: Address
  let wallet4: Address

  let mixer: CryptoKombatMixerVRF
  let collection: TestERC1155
  let link: TestERC223

  before(async () => {
    deployer = (await getNamedAccounts()).deployer
    const accounts = await getUnnamedAccounts()

    notAdmin = accounts[0]
    coordinator = accounts[1]
    wallet2 = accounts[2]
    wallet3 = accounts[3]
    wallet4 = accounts[4]
    hre.tracer.nameTags[ethers.constants.AddressZero] = 'Zero'
    hre.tracer.nameTags[deployer] = 'Deployer'
    hre.tracer.nameTags[notAdmin] = 'NotAdmin'
    hre.tracer.nameTags[coordinator] = 'Coordinator'
    hre.tracer.nameTags[wallet2] = 'Wallet2'
    hre.tracer.nameTags[wallet3] = 'Wallet3'
    hre.tracer.nameTags[wallet4] = 'Wallet4'
  })

  beforeEach(async () => {
    const ProxyContract = await ethers.getContractFactory('MockProxyRegistry')
    const proxy = await ProxyContract.deploy()
    await proxy.setProxy(deployer, coordinator)

    const CollectionContract = await ethers.getContractFactory('TestERC1155')
    collection = (await CollectionContract.deploy('https://uat-eth-api.cryptokombat.com/hero/', proxy.address)) as TestERC1155

    const LinkContract = await ethers.getContractFactory('TestERC223')
    link = (await LinkContract.deploy('LINK', 'LINK')) as TestERC223

    const MixerContract = await ethers.getContractFactory('CryptoKombatMixerVRF')
    mixer = (await MixerContract.deploy(coordinator, link.address, fee, keyHash, collection.address)) as CryptoKombatMixerVRF

    hre.tracer.nameTags[proxy.address] = 'ProxyContract'
    hre.tracer.nameTags[collection.address] = 'CollectionContract'
    hre.tracer.nameTags[mixer.address] = 'MixerContract'

    await collection.createBatch(createTokenArgs.maxArray, createTokenArgs.initialArray, ethers.constants.HashZero)
    await collection.grantRole(MINTER_ROLE, mixer.address)
    await collection.setApprovalForAll(mixer.address, true)

    await mixer.setEditionToIdMapping(HeroEdition.GENESIS, testTokenEditionMapping[HeroEdition.GENESIS])
    await mixer.setEditionToIdMapping(HeroEdition.EPIC, testTokenEditionMapping[HeroEdition.EPIC])
    await mixer.setEditionToIdMapping(HeroEdition.RARE, testTokenEditionMapping[HeroEdition.RARE])
    await mixer.setEditionToIdMapping(HeroEdition.COMMON, testTokenEditionMapping[HeroEdition.COMMON])

    await mixer.setMixerConfig(HeroEdition.COMMON, mixerConfig[HeroEdition.COMMON]?.editions, mixerConfig[HeroEdition.COMMON]?.chances)
    await mixer.setMixerConfig(HeroEdition.RARE, mixerConfig[HeroEdition.RARE]?.editions, mixerConfig[HeroEdition.RARE]?.chances)
    await mixer.setMixerConfig(HeroEdition.EPIC, mixerConfig[HeroEdition.EPIC]?.editions, mixerConfig[HeroEdition.EPIC]?.chances)

    await link.setBalance(mixer.address, ethers.utils.parseUnits('100'))
  })

  describe('#contructor()', async () => {
    it('should set up collection', async () => {
      expect(await mixer.collection()).to.be.equal(collection.address)
      expect(await mixer.chainlinkFee()).to.be.equal(fee)
    })
  })

  describe('#mixHeroes()', async () => {
    it('Mix 3 common heroes, check rates', async () => {
      let epicCount = 0
      let rareCount = 0
      let commonCount = 0

      for (let i = 0; i < totalHits; i++) {
        let tx = await mixer.mixHeroes(commonMixArray)
        let receipt: ContractReceipt = await tx.wait()
        const requestEvent = getEvent(receipt, mixer.address, 'MixRequested')

        const requestId = requestEvent?.args?.requestId

        const random = Math.floor(Math.random() * 1000000)

        tx = await mixer.connect(await ethers.getSigner(coordinator)).rawFulfillRandomness(requestId, random)
        receipt = await tx.wait()

        const event = getEvent(receipt, mixer.address, 'HeroesMixSuceess')

        if (event && event.args && event.args.editionOut === HeroEdition.COMMON) {
          commonCount++
        }
        if (event && event.args && event.args.editionOut === HeroEdition.RARE) {
          rareCount++
        }
        if (event && event.args && event.args.editionOut === HeroEdition.EPIC) {
          epicCount++
        }
      }
      const ref = {
        common: mixerConfig[HeroEdition.COMMON].chances[0] / 1000,
        rare: mixerConfig[HeroEdition.COMMON].chances[1] / 1000,
        epic: mixerConfig[HeroEdition.COMMON].chances[2] / 1000,
      }
      //console.log('[Ref]   COMMON %d, RARE %d, EPIC %d', ref.common, ref.rare, ref.epic)

      const rates = {
        common: (commonCount / totalHits) * 100,
        rare: (rareCount / totalHits) * 100,
        epic: (epicCount / totalHits) * 100,
      }

      console.log('[Rates] COMMON %d, RARE %d, EPIC %d', rates.common, rates.rare, rates.epic)

      const diff = {
        common: {
          from: ref.common - expectedDeviation,
          to: ref.common + expectedDeviation,
        },
        rare: {
          from: ref.rare - expectedDeviation,
          to: ref.rare + expectedDeviation,
        },
        epic: {
          from: ref.epic - expectedDeviation > 0 ? ref.epic - expectedDeviation : 0,
          to: ref.epic + expectedDeviation,
        },
      }

      console.log(
        '[Diff]  COMMON %d-%d, RARE %d-%d, EPIC %d-%d',
        diff.common.from,
        diff.common.to,
        diff.rare.from,
        diff.rare.to,
        diff.epic.from,
        diff.epic.to
      )
      expect(rates.common).to.be.within(diff.common.from, diff.common.to)
      expect(rates.rare).to.be.within(diff.rare.from, diff.rare.to)
      expect(rates.epic).to.be.within(diff.epic.from, diff.epic.to)
    })
  })
})
