import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { sleep } from '../src/utils'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, run, ethers } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const uri = 'https://uat-eth-api.cryptokombat.com/hero/'

  const args = [uri]

  const collectionContract = await deploy('TestERC1155', {
    from: deployer,
    args,
    log: true,
  })

  console.log('Collection deployed successfully: ', collectionContract.address)

  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      console.log('Waiting to verify...')

      await sleep(25000)

      await run('verify:verify', {
        address: collectionContract.address,
        constructorArguments: args,
        contract: 'contracts/test/TestERC1155.sol:TestERC1155',
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
func.tags = ['Collection']
