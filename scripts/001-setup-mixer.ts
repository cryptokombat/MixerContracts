import hre from 'hardhat'

import { getTokenMapping, HeroEdition, mixerConfig, getCollectionAddress } from '../src/config'

import { CryptoKombatMixer, TestERC1155 } from '../typechain'

async function main() {
  const { getNamedAccounts, ethers, getChainId } = hre
  const { deployer } = await getNamedAccounts()
  const signer = await ethers.getSigner(deployer)

  const chainId = await getChainId()
  const collectionAddress = await getCollectionAddress(chainId)
  const collectionInstance = (await ethers.getContractAt('TestERC1155', collectionAddress, signer)) as TestERC1155
  const mixerInstance = (await ethers.getContract('CryptoKombatMixer', signer)) as CryptoKombatMixer

  console.log('Collection instance loaded at %s', collectionInstance.address)
  console.log('Mixer instance loaded at %s', mixerInstance.address)

  const edition = await mixerInstance.heroIdToEdition(1)
  const minterRole = await ethers.utils.id('MINTER_ROLE')

  if (edition === 0) {
    console.log('[Mixer] Setting data...')

    console.log('[Collection] Setting minter role...')
    await collectionInstance.grantRole(minterRole, mixerInstance.address)

    const mapping = await getTokenMapping(chainId)

    if (mapping) {
      await mixerInstance.setEditionToIdMapping(HeroEdition.GENESIS, mapping[HeroEdition.GENESIS])
      console.log('[Mixer] Set GENESIS: %s', JSON.stringify(mapping[HeroEdition.GENESIS]))

      await mixerInstance.setEditionToIdMapping(HeroEdition.EPIC, mapping[HeroEdition.EPIC])
      console.log('[Mixer] Set EPIC: %s', JSON.stringify(mapping[HeroEdition.EPIC]))

      await mixerInstance.setEditionToIdMapping(HeroEdition.RARE, mapping[HeroEdition.RARE])
      console.log('[Mixer] Set RARE: %s', JSON.stringify(mapping[HeroEdition.RARE]))

      await mixerInstance.setEditionToIdMapping(HeroEdition.COMMON, mapping[HeroEdition.COMMON])
      console.log('[Mixer] Set COMMON: %s', JSON.stringify(mapping[HeroEdition.COMMON]))

      await mixerInstance.setMixerConfig(
        HeroEdition.COMMON,
        mixerConfig[HeroEdition.COMMON]?.editions,
        mixerConfig[HeroEdition.COMMON]?.chances
      )
      console.log('[Mixer] Set COMMON config: %s', JSON.stringify(mixerConfig[HeroEdition.COMMON]))

      await mixerInstance.setMixerConfig(HeroEdition.RARE, mixerConfig[HeroEdition.RARE]?.editions, mixerConfig[HeroEdition.RARE]?.chances)
      console.log('[Mixer] Set RARE config: %s', JSON.stringify(mixerConfig[HeroEdition.RARE]))

      await mixerInstance.setMixerConfig(HeroEdition.EPIC, mixerConfig[HeroEdition.EPIC]?.editions, mixerConfig[HeroEdition.EPIC]?.chances)
      console.log('[Mixer] Set EPIC config: %s', JSON.stringify(mixerConfig[HeroEdition.EPIC]))
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
