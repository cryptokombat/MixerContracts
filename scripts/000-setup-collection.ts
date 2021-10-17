import hre from 'hardhat'

import { createTokenArgs } from '../src/config'

import { TestERC1155 } from '../typechain'

async function main() {
  const { getNamedAccounts, ethers } = hre
  const { deployer } = await getNamedAccounts()
  const signer = await ethers.getSigner(deployer)

  const collectionInstance = (await ethers.getContract('TestERC1155', signer)) as TestERC1155

  console.log('Collection instance loaded at %s', collectionInstance.address)

  const supply = await collectionInstance.maxSupply(1)
  //const minterRole = await collectionInstance.MINTER_ROLE()

  if (supply.eq(0)) {
    console.log('[Collection] Minting new tokens...')
    await collectionInstance.createBatch(createTokenArgs.maxArray, createTokenArgs.initialArray, ethers.constants.HashZero)

    // console.log('[Collection] Setting minter role...')
    // await collectionInstance.grantRole(minterRole, mixerInstance.address)
  } else {
    console.log('[Collection] Minting skipped...')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
