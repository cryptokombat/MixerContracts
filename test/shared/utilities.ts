const { ethers } = require("hardhat")

import { Contract, BigNumber, BigNumberish, utils, ContractReceipt, Event } from "ethers"

const BASE_TEN = 10

export function expandTo18Decimals(n: number | string): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: BigNumberish, decimals: number = 18): BigNumber {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals))
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
  return [
    reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1),
  ]
}

export async function humanBalance(
  token: Contract,
  method: string = "balanceOf",
  address?: string | null | undefined,
  label?: string | null | undefined,
  log: boolean = true
) {
  const tokenSymbol = await token.symbol()
  let balance: BigNumber = BigNumber.from(0)

  try {
    const args = address ? [address] : []
    balance = await token.functions[method](...args)
  } catch (error) {}

  let formattedBalance: string | undefined

  try {
    formattedBalance = utils.formatUnits(balance.toString(), 9)
    label = label ? label : address
    label = label ? label : ""

    if (log) {
      console.log(`token.${method}(${label}): ${formattedBalance} ${tokenSymbol}`)
    }
  } catch (error) {}

  return formattedBalance
}

export const getEvent = (receipt: ContractReceipt, contractAddress: string, eventName: string): Event | undefined => {
  return receipt.events?.find((e) => e.address == contractAddress && e.event == eventName)
}
