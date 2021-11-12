import hre from 'hardhat'

import { getTokenMapping, HeroEdition, getCollectionAddress, COMMON_CONFIG, RARE_CONFIG } from '../src/config'

import { CryptoKombatMixer, CryptoKombatMixerVRF, TestERC1155 } from '../typechain'

async function main() {
  const { getNamedAccounts, ethers, getChainId } = hre
  const { deployer } = await getNamedAccounts()
  const signer = await ethers.getSigner(deployer)

  const chainId = await getChainId()
  const collectionAddress = await getCollectionAddress(chainId)
  const collectionInstance = (await ethers.getContractAt('TestERC1155', collectionAddress, signer)) as TestERC1155
  //const mixerInstance = (await ethers.getContract('CryptoKombatMixer', signer)) as CryptoKombatMixer
  const mixerInstance = (await ethers.getContract('CryptoKombatMixerVRF', signer)) as CryptoKombatMixerVRF

  console.log('Collection instance loaded at %s', collectionInstance.address)
  console.log('Mixer instance loaded at %s', mixerInstance.address)

  const edition = await mixerInstance.heroIdToEdition(1)
  const minterRole = await ethers.utils.id('MINTER_ROLE')

  if (edition === 0) {
    console.log('[Mixer] Setting data...')

    let tx = await collectionInstance.grantRole(minterRole, mixerInstance.address)
    console.log('[Collection] Setting minter role...', tx.hash)

    const mapping = await getTokenMapping(chainId)

    if (mapping) {
      tx = await mixerInstance.setEditionToIdMapping(HeroEdition.GENESIS, mapping[HeroEdition.GENESIS])
      console.log('[Mixer] Set GENESIS: %s', JSON.stringify(mapping[HeroEdition.GENESIS]), tx.hash)

      tx = await mixerInstance.setEditionToIdMapping(HeroEdition.EPIC, mapping[HeroEdition.EPIC])
      console.log('[Mixer] Set EPIC: %s', JSON.stringify(mapping[HeroEdition.EPIC]), tx.hash)

      tx = await mixerInstance.setEditionToIdMapping(HeroEdition.RARE, mapping[HeroEdition.RARE])
      console.log('[Mixer] Set RARE: %s', JSON.stringify(mapping[HeroEdition.RARE]), tx.hash)

      tx = await mixerInstance.setEditionToIdMapping(HeroEdition.COMMON, mapping[HeroEdition.COMMON])
      console.log('[Mixer] Set COMMON: %s', JSON.stringify(mapping[HeroEdition.COMMON]), tx.hash)

      tx = await mixerInstance.setMixerConfig(HeroEdition.COMMON, COMMON_CONFIG.editions, COMMON_CONFIG.chances)
      console.log('[Mixer] Set COMMON config: %s', JSON.stringify(COMMON_CONFIG), tx.hash)

      tx = await mixerInstance.setMixerConfig(HeroEdition.RARE, RARE_CONFIG.editions, RARE_CONFIG.chances)
      console.log('[Mixer] Set RARE config: %s', JSON.stringify(RARE_CONFIG), tx.hash)
    } else {
      console.log('[Mixer] Token mapping not found.')
    }
  } else {
    console.log('[Mixer] Setup skipped...')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
