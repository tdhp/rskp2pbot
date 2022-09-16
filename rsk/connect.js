const ethers = require('ethers')
const dapiServerDeployment = require('@api3/operations/chain/deployments/polygon-testnet/DapiServer.json')
const { rifContractAbi } = require('./rif')
const { toUncheckedAddress } = require('./utils')

const ethersProvider = new ethers.getDefaultProvider(process.env.RSK_CHAIN_HOST)

const rifErc20 = new ethers.Contract(
  toUncheckedAddress(process.env.RIF_CONTRACT_ADDRESS),
  rifContractAbi,
  ethersProvider,
)

const voidSignerAddressZero = new ethers.VoidSigner(ethers.constants.AddressZero, ethersProvider)
const dApi3Server = new ethers.Contract(
  process.env.API3_DAPI_SERVER_CONTRACT_ADDRESS,
  dapiServerDeployment.abi,
  voidSignerAddressZero
)

module.exports = {
  ethersProvider,
  ethers,
  dApi3Server,
  rifErc20,
};
