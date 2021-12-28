import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { getCollectionAddress, getXmasTokenId } from '../src/config'
import { sleep } from '../src/utils'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, run } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()
  const collectionAddress = await getCollectionAddress(chainId)
  const tokenId = await getXmasTokenId(chainId)

  const args = [collectionAddress, tokenId, 1640688528, 1641513600]
  //Tuesday, December 28, 2021 10:48:48 = 1640688528
  //Wednesday, December 29, 2021 0:00:00 = 1640736000
  //Friday, January 7, 2022 0:00:00 = 1641513600

  const claimContract = await deploy('CryptoKombatClaim', {
    from: deployer,
    args,
    log: true,
  })

  console.log('Claim contract deployed successfully: ', claimContract.address)

  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      console.log('Waiting to verify...')

      await sleep(25000)

      await run('verify:verify', {
        address: claimContract.address,
        constructorArguments: args,
      })
    } catch (err) {
      console.log(err)
    }
  } else {
    console.log('Verification skipped...')
  }

  console.log('Done')
}

export default func
func.tags = ['Claim']
