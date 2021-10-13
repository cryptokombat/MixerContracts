import hre from 'hardhat'

import { tokenEditionMapping, HeroEdition, createTokenArgs, mixerConfig } from '../src/config'

import { CryptoKombatMixer, TestERC1155 } from '../typechain'

async function main() {
  const { getNamedAccounts, ethers } = hre
  const { deployer } = await getNamedAccounts()
  const signer = await ethers.getSigner(deployer)

  const collectionInstance = (await ethers.getContract('TestERC1155', signer)) as TestERC1155
  const mixerInstance = (await ethers.getContract('CryptoKombatMixer', signer)) as CryptoKombatMixer

  console.log('Collection instance loaded at %s', collectionInstance.address)
  console.log('Mixer instance loaded at %s', mixerInstance.address)

  const supply = await collectionInstance.maxSupply(1)
  const edition = await mixerInstance.heroIdToEdition(1)
  const minterRole = await collectionInstance.MINTER_ROLE()

  if (supply.eq(0)) {
    console.log('[Collection] Minting new tokens...')
    await collectionInstance.createBatch(createTokenArgs.maxArray, createTokenArgs.initialArray, ethers.constants.HashZero)

    console.log('[Collection] Setting minter role...')
    await collectionInstance.grantRole(minterRole, mixerInstance.address)
  } else {
    console.log('[Collection] Minting skipped...')
  }

  if (edition === 0) {
    console.log('[Mixer] Setting data...')

    await mixerInstance.setEditionToIdMapping(HeroEdition.GENESIS, tokenEditionMapping[HeroEdition.GENESIS])
    console.log('[Mixer] Set GENESIS: %s', JSON.stringify(tokenEditionMapping[HeroEdition.GENESIS]))

    await mixerInstance.setEditionToIdMapping(HeroEdition.EPIC, tokenEditionMapping[HeroEdition.EPIC])
    console.log('[Mixer] Set EPIC: %s', JSON.stringify(tokenEditionMapping[HeroEdition.EPIC]))

    await mixerInstance.setEditionToIdMapping(HeroEdition.RARE, tokenEditionMapping[HeroEdition.RARE])
    console.log('[Mixer] Set RARE: %s', JSON.stringify(tokenEditionMapping[HeroEdition.RARE]))

    await mixerInstance.setEditionToIdMapping(HeroEdition.COMMON, tokenEditionMapping[HeroEdition.COMMON])
    console.log('[Mixer] Set COMMON: %s', JSON.stringify(tokenEditionMapping[HeroEdition.COMMON]))

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
    console.log('[Mixer] Setup skipped...')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
