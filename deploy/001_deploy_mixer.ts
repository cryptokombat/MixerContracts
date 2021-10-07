import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { getCollectionAddress, getChainlinkConfig } from '../src/config'
import { sleep } from '../src/utils'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, run } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()
  const chainlinkConfig = await getChainlinkConfig(chainId)
  const collectionAddress = await getCollectionAddress(chainId)

  const args = [collectionAddress, chainlinkConfig.link, chainlinkConfig.coordinator, chainlinkConfig.keyhash, chainlinkConfig.fee]

  const mixerContract = await deploy('CryptoKombatMixer', {
    from: deployer,
    args,
    log: true,
  })

  console.log('Mixer deployed successfully: ', mixerContract.address)

  console.log('Waiting to verify...')

  await sleep(25000)

  await run('verify:verify', {
    address: mixerContract.address,
    constructorArguments: args,
  })
}

export default func
func.tags = ['Token']
