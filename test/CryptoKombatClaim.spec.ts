import { expect } from './chai-setup'
import hre, { getNamedAccounts, getUnnamedAccounts, ethers } from 'hardhat'

import { Address } from 'hardhat-deploy/types'

import { TestERC1155, CryptoKombatClaim } from '../typechain'

const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

const args = [1, 1640688528, 1641513600]

context('CryptoKombatClaim', () => {
  let deployer: Address
  let notAdmin: Address
  let wallet1: Address
  let wallet2: Address
  let wallet3: Address
  let wallet4: Address

  let claim: CryptoKombatClaim
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

    const ClaimContract = await ethers.getContractFactory('CryptoKombatClaim')
    const deployArgs = []
    claim = (await ClaimContract.deploy(collection.address, ...args)) as CryptoKombatClaim

    hre.tracer.nameTags[proxy.address] = 'ProxyContract'
    hre.tracer.nameTags[collection.address] = 'CollectionContract'
    hre.tracer.nameTags[claim.address] = 'ClaimContract'

    await collection.create(2021, 0, ethers.constants.HashZero)
    await collection.grantRole(MINTER_ROLE, claim.address)
  })

  describe('#contructor()', async () => {
    it('should set up collection', async () => {
      expect(await claim.collection()).to.be.equal(collection.address)
      expect(await claim.owner()).to.be.equal(deployer)
    })
  })

  describe('#admin()', async () => {
    it('should update start end', async () => {
      await claim.setStartEnd(args[1], args[2])
      expect(await claim.CLAIM_START()).to.be.equal(args[1])
      expect(await claim.CLAIM_END()).to.be.equal(args[2])
    })
    it('should revert for non admin', async () => {
      await expect(claim.connect(await ethers.getSigner(notAdmin)).setStartEnd(args[1], args[2])).to.be.revertedWith('!owner')
    })
  })

  describe('#mixHeroes()', async () => {
    it('Anyone can claim', async () => {
      await expect(claim.claim()).to.emit(claim, 'Claimed').withArgs(deployer)
    })

    it('Cant claim twice', async () => {
      await expect(claim.claim()).to.emit(claim, 'Claimed').withArgs(deployer)
      await expect(claim.claim()).to.be.revertedWith('!claimed')
    })
  })
})
