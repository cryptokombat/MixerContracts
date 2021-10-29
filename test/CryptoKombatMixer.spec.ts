import { expect } from './chai-setup'
import hre, { getNamedAccounts, getUnnamedAccounts, ethers } from 'hardhat'

import { ContractReceipt } from 'ethers'
import { Address } from 'hardhat-deploy/types'

import { getEvent } from './shared/utilities'
import { TestERC1155, CryptoKombatMixer } from '../typechain'

import { COMMON_CONFIG, createTokenArgs, HeroEdition, mixerConfig, RARE_CONFIG, testTokenEditionMapping } from '../src/config'

const commonMixArray = testTokenEditionMapping[HeroEdition.COMMON].slice(0, 3)
const rareMixArray = testTokenEditionMapping[HeroEdition.RARE].slice(0, 3)

const totalHits = 200
const expectedDeviation = (100 / totalHits) * 10 // 10% from total hits

const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

context('CryptoKombatMixer', () => {
  let deployer: Address
  let notAdmin: Address
  let wallet1: Address
  let wallet2: Address
  let wallet3: Address
  let wallet4: Address

  let mixer: CryptoKombatMixer
  let collection: TestERC1155

  before(async () => {
    deployer = (await getNamedAccounts()).deployer
    const accounts = await getUnnamedAccounts()

    notAdmin = accounts[0]
    wallet1 = accounts[1]
    wallet2 = accounts[2]
    wallet3 = accounts[3]
    wallet4 = accounts[4]
    hre.tracer.nameTags[ethers.constants.AddressZero] = 'Zero'
    hre.tracer.nameTags[deployer] = 'Deployer'
    hre.tracer.nameTags[notAdmin] = 'NotAdmin'
    hre.tracer.nameTags[wallet1] = 'Wallet1'
    hre.tracer.nameTags[wallet2] = 'Wallet2'
    hre.tracer.nameTags[wallet3] = 'Wallet3'
    hre.tracer.nameTags[wallet4] = 'Wallet4'
  })

  beforeEach(async () => {
    const ProxyContract = await ethers.getContractFactory('MockProxyRegistry')
    const proxy = await ProxyContract.deploy()
    await proxy.setProxy(deployer, wallet1)

    const CollectionContract = await ethers.getContractFactory('TestERC1155')
    collection = (await CollectionContract.deploy('https://uat-eth-api.cryptokombat.com/hero/', proxy.address)) as TestERC1155

    const MixerContract = await ethers.getContractFactory('CryptoKombatMixer')
    mixer = (await MixerContract.deploy(collection.address)) as CryptoKombatMixer

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

    await mixer.setMixerConfig(HeroEdition.COMMON, COMMON_CONFIG.editions, COMMON_CONFIG.chances)
    await mixer.setMixerConfig(HeroEdition.RARE, RARE_CONFIG.editions, RARE_CONFIG.chances)
  })

  describe('#contructor()', async () => {
    it('should set up collection', async () => {
      expect(await mixer.collection()).to.be.equal(collection.address)
    })
  })

  describe('#mixHeroes()', async () => {
    it('Mix 3 common heroes, check rates', async () => {
      let epicCount = 0
      let rareCount = 0
      let commonCount = 0

      for (let i = 0; i < totalHits; i++) {
        const tx = await mixer.mixHeroes(commonMixArray)
        const receipt: ContractReceipt = await tx.wait()
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
        common: COMMON_CONFIG.chances[2] / 1000,
        rare: COMMON_CONFIG.chances[1] / 1000,
        epic: COMMON_CONFIG.chances[0] / 1000,
      }
      console.log('[Ref]   COMMON %d, RARE %d, EPIC %d', ref.common.toFixed(2), ref.rare.toFixed(2), ref.epic.toFixed(2))

      const rates = {
        common: (commonCount / totalHits) * 100,
        rare: (rareCount / totalHits) * 100,
        epic: (epicCount / totalHits) * 100,
      }

      console.log('[Rates] COMMON %d, RARE %d, EPIC %d', rates.common.toFixed(2), rates.rare.toFixed(2), rates.epic.toFixed(2))

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
        diff.common.from.toFixed(2),
        diff.common.to.toFixed(2),
        diff.rare.from.toFixed(2),
        diff.rare.to.toFixed(2),
        diff.epic.from.toFixed(2),
        diff.epic.to.toFixed(2)
      )
      expect(rates.common).to.be.within(diff.common.from, diff.common.to)
      expect(rates.rare).to.be.within(diff.rare.from, diff.rare.to)
      expect(rates.epic).to.be.within(diff.epic.from, diff.epic.to)
      expect(epicCount + rareCount + commonCount).to.be.eq(totalHits)
    })

    it('Mix 3 rare heroes, check rates', async () => {
      let epicCount = 0
      let rareCount = 0
      let commonCount = 0

      for (let i = 0; i < totalHits; i++) {
        const tx = await mixer.mixHeroes(rareMixArray)
        const receipt: ContractReceipt = await tx.wait()
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
        common: RARE_CONFIG.chances[0] / 1000,
        rare: RARE_CONFIG.chances[2] / 1000,
        epic: RARE_CONFIG.chances[1] / 1000,
      }
      console.log('[Ref] COMMON %d, RARE %d, EPIC %d', ref.common.toFixed(2), ref.rare.toFixed(2), ref.epic.toFixed(2))

      const rates = {
        common: (commonCount / totalHits) * 100,
        rare: (rareCount / totalHits) * 100,
        epic: (epicCount / totalHits) * 100,
      }

      console.log('[Rates] COMMON %d, RARE %d, EPIC %d', rates.common.toFixed(2), rates.rare.toFixed(2), rates.epic.toFixed(2))

      const diff = {
        common: {
          from: ref.common - expectedDeviation > 0 ? ref.common - expectedDeviation : 0,
          to: ref.common + expectedDeviation,
        },
        rare: {
          from: ref.rare - expectedDeviation > 0 ? ref.rare - expectedDeviation : 0,
          to: ref.rare + expectedDeviation,
        },
        epic: {
          from: ref.epic - expectedDeviation > 0 ? ref.epic - expectedDeviation : 0,
          to: ref.epic + expectedDeviation,
        },
      }

      console.log(
        '[Diff]  COMMON %d-%d, RARE %d-%d, EPIC %d-%d',
        diff.common.from.toFixed(2),
        diff.common.to.toFixed(2),
        diff.rare.from.toFixed(2),
        diff.rare.to.toFixed(2),
        diff.epic.from.toFixed(2),
        diff.epic.to.toFixed(2)
      )
      expect(rates.common).to.be.within(diff.common.from, diff.common.to)
      expect(rates.rare).to.be.within(diff.rare.from, diff.rare.to)
      expect(rates.epic).to.be.within(diff.epic.from, diff.epic.to)
      expect(epicCount + rareCount + commonCount).to.be.eq(totalHits)
    })
  })
})
