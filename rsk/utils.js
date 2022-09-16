const { toChecksumAddress } = require('@rsksmart/rsk-utils/dist/addresses')
const { ethers} = require('ethers')
const { BigDecimal } = require('../util/big_decimal')
const EXPONENT = '10'

const satsToWeis = (sats) => ethers.utils.parseUnits(sats + '', EXPONENT)

const rifsToWeis = (rifs) => ethers.utils.parseUnits(rifs + '', 'ether')

const weisToSats = (weis) => BigDecimal.fromBigInt(new BigInt(weis)).divide(Math.pow(10, parseInt(EXPONENT)));

const printObjectProperties = (object) =>
  require('util').inspect(object, {showHidden: false, depth: null, colors: true})

const toRskCheckSumAddress = (address) =>
  toChecksumAddress(toUncheckedAddress(address), process.env.RSK_CHAIN_NETWORK_ID)

const toUncheckedAddress = (checkedAddress) => checkedAddress.toLowerCase()

module.exports = {
  satsToWeis,
  weisToSats,
  printObjectProperties,
  toUncheckedAddress,
  toRskCheckSumAddress,
  rifsToWeis,
}
