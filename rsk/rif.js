const { ethers } = require('ethers')
const rifContractAbi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]

const computeRIFTransferMethodId = () => {
  const transferFunctionSignatureBytes = ethers.utils.toUtf8Bytes('transfer(address,uint256)')
  const transferFunctionKeccak256 = ethers.utils.keccak256(transferFunctionSignatureBytes)
  const transferFunctionKeccak256Array = ethers.utils.arrayify(transferFunctionKeccak256)
  return transferFunctionKeccak256Array.slice(0, 4)
}

module.exports = {
  rifContractAbi,
  computeRIFTransferMethodId,
}
