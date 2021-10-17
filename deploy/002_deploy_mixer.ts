import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { getCollectionAddress } from '../src/config'
import { sleep } from '../src/utils'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, run } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()
  const collectionAddress = await getCollectionAddress(chainId)

  const args = [collectionAddress]

  const mixerContract = await deploy('CryptoKombatMixer', {
    from: deployer,
    args,
    log: true,
  })

  console.log('Mixer deployed successfully: ', mixerContract.address)

  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      console.log('Waiting to verify...')

      await sleep(25000)

      await run('verify:verify', {
        address: mixerContract.address,
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
func.tags = ['Mixer']
