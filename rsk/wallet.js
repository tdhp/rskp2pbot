const { ethersProvider, ethers, rifErc20 } = require('./connect');
const logger = require('../logger');
const { printObjectProperties, toUncheckedAddress } = require('./utils')
const { EscrowAccount } = require('../models')
const { rifContractAbi } = require('./rif')
const { BigNumber } = require('ethers')

const wallets = new Map()

const loadEscrowAccounts = async () => {

  try {
    const escrowAccounts = await EscrowAccount.find()
    for (account of escrowAccounts) {
      const wallet = await ethers.Wallet.fromEncryptedJson(account.secret, process.env.ESCROW_ACCOUNTS_PASSWORD)
      wallets.set(account.address, wallet)
    }
    return escrowAccounts.length
  } catch (e) {
    logger.error(`loadEscrowAccounts error: ${e}`)
  }
}

const useEscrowAccount = async (asset) => {

  const availableAccounts = await EscrowAccount.find({
    status: 'AVAILABLE',
  })

  let account
  if (availableAccounts.length) {
    account = availableAccounts[0]
  } else {
    account = await _createEscrowAccount(asset)
  }

  account.status = 'BUSY'
  await account.save()

  return account
}

const _createEscrowAccount = async (asset) => {
  try {
    const escrowAccountWallet = await ethers.Wallet.createRandom()
    const address = toUncheckedAddress(escrowAccountWallet.address)
    wallets.set(address, escrowAccountWallet)

    logger.debug(`New escrow account: ${address}`)

    const secret = await escrowAccountWallet
      .encrypt(process.env.ESCROW_ACCOUNTS_PASSWORD)

    return new EscrowAccount({
      address,
      secret,
    })
  } catch (error) {
    logger.error(error)
  }
};

const releaseEscrowAccount = async (address) => {

  const account = await EscrowAccount.findOne({
    address,
  })
  if (account === undefined) {
    logger.error(`releaseEscrowAccount error, account with ${address} not found`)
    return
  }

  account.status = 'AVAILABLE'
  account.balance_sats = await getBalance(address)
  account.balance_rif = await getRIFBalance(address)

  await account.save()
  logger.debug(`Escrow account ${address} released.`)
};

const revertTransaction = async ({
  escrowAccountAddress,
  depositedAmount,
  depositBlockNumber,
}) => {

  try {
    logger.debug(`revertTransaction from ${escrowAccountAddress} of ${depositedAmount}`)
    const depositTransaction = await findTransaction(escrowAccountAddress,{
      value: depositedAmount,
      blockNumber: depositBlockNumber,
      maxNumberOfBlocksHistory: process.env.RSK_NUMBER_OF_CONFIRMATION_BLOCKS + 1,
    })
    if (depositTransaction === undefined) {
      logger.notice(`Deposit transaction to escrow account ${escrowAccountAddress} could not be found.`)
      return
    }

    const sellerAddress = depositTransaction.from
    const balance = await getBalance(escrowAccountAddress)
    return await sendTransaction({
      to: sellerAddress,
      from: escrowAccountAddress,
      amount: balance + '',
    })
  } catch (error) {
    logger.error(error)
  }
};

function computeRskTransactionData(transactionData) {
  if (transactionData) {
    return ethers.utils.hexlify(ethers.utils.base64.decode(transactionData))
  }
  return '0x'
}

const findTransaction = async (
    recipientAddress,
    options = {
      contractAddress: undefined,
      maxNumberOfBlocksHistory: 1000,
      transactionData: undefined,
      value: undefined,
      blockNumber: undefined,
    },
  ) => {

  logger.debug(`Looking for transaction @ ${recipientAddress}, options: ${printObjectProperties(options)}`)
  try {
    const startingBlockNumber =  options.blockNumber ?? await ethersProvider.getBlockNumber()
    return await new Promise(async (resolve, reject) => {
      await scheduleBlockQuery({
          startingBlockNumber,
          blockNumber: startingBlockNumber,
          resolve: resolve,
          reject: reject,
          options: options,
        })
    })
  } catch (e) {
    logger.error(`findTransaction error ${e.message}`)
  }

  async function scheduleBlockQuery({
    startingBlockNumber,
    blockNumber,
    resolve,
    reject,
    options,
  }) {

    const computedTransactionData = computeRskTransactionData(options.transactionData)

    setTimeout(async () => {

      const block = await ethersProvider.getBlockWithTransactions(blockNumber)
      for (const transaction of block.transactions) {
        if (toUncheckedAddress(transaction.to) === toUncheckedAddress(recipientAddress) &&
          transaction.data === computedTransactionData &&
          (options.value === undefined || options.value + '' === transaction.value.toString())) {
          resolve(transaction)
          return
        } else {
          logger.debug(`findTransaction ignored transaction of value ${transaction.value.toString()},` +
            ` sent to ${transaction.to} in block ${blockNumber} ` +
            ` (${options.maxNumberOfBlocksHistory - (startingBlockNumber - blockNumber)} left to search)`)
        }
      }
      --blockNumber
      if ((startingBlockNumber - blockNumber) > options.maxNumberOfBlocksHistory
        || blockNumber <= 0) {
        resolve(undefined)
      } else {
        await scheduleBlockQuery({
          startingBlockNumber: startingBlockNumber,
          blockNumber: blockNumber,
          resolve,
          reject,
          options,
        })
      }

    }, 250)
  }
}

const sendTransaction = async ({ to, from, amount, data }) => {

  logger.debug(`sendTransaction is sending ${amount} weis 🅱️ to ${to} ➡️ from ${from} ⬅️.`)

  const wallet = wallets.get(from)
  if (wallet === undefined) {
    logger.error(`Could not find wallet corresponding to the escrow account ${from}`)
    return
  }
  const onlineWallet = await wallet.connect(ethersProvider)
  let value = ethers.utils.parseUnits(amount, 'wei')
  const transactionRequest = {
    to,
    value,
    data: computeRskTransactionData(data),
    // chainId: process.env.RSK_CHAIN_NETWORK_ID,
  }
  const gas = await ethersProvider.estimateGas(transactionRequest)
  const gasPrice = await ethersProvider.getGasPrice()
  value -= (gas * gasPrice)
  logger.debug(`Before gas deduction: ${transactionRequest.value}, after: ${value}`)
  transactionRequest.value = value
  const unconfirmedTransaction = await onlineWallet.sendTransaction(transactionRequest)

  try {
    const receipt = await unconfirmedTransaction.wait(process.env.RSK_NUMBER_OF_CONFIRMATIONS)
    return {
      gas_fee: receipt.gasUsed * gasPrice,
      value,
      ...receipt,
    }
  } catch (e) {
    logger.debug(`Failed transaction receipt: ${printObjectProperties(e.receipt)}`)
  }
}

const sendRIFTransaction = async ({ to, from, amount }) => {

  logger.debug(`sendRIFTransaction is sending ${amount} weis 🅱️ from ${from} ➡️ to ${to}.`)

  const wallet = wallets.get(from)
  if (wallet === undefined) {
    logger.error(`Could not find wallet corresponding to the escrow account ${from}`)
    return
  }

  try {
    const onlineWallet = await wallet.connect(ethersProvider)
    const signedRifErc20 = new ethers.Contract(
      toUncheckedAddress(process.env.RIF_CONTRACT_ADDRESS),
      rifContractAbi,
      onlineWallet,
    )
    let token = amount
    const gas = await signedRifErc20.estimateGas.transfer(to, token)
    const gasPrice = await ethersProvider.getGasPrice()
    const gasCost = gas.mul(gasPrice)
    token = BigNumber.from((token - gasCost) + '')
    logger.debug(`Gas cost: ${gasCost}`)

    const unconfirmedTransaction = await signedRifErc20.transfer(to, token)
    const receipt = await unconfirmedTransaction.wait(process.env.RSK_NUMBER_OF_CONFIRMATIONS)
    return {
      gas_fee: receipt.gasUsed * gasPrice,
      token,
      ...receipt,
    }
  } catch (e) {
    logger.debug(`Failed transaction receipt: ${e}`)
  }
}

const getBalance = async (address) => await ethersProvider.getBalance(address)

const getRIFBalance = async (address) => (await rifErc20.balanceOf(toUncheckedAddress(address)))

module.exports = {
  useEscrowAccount,
  releaseEscrowAccount,
  revertTransaction,
  findTransaction,
  sendTransaction,
  sendRIFTransaction,
  getBalance,
  loadEscrowAccounts,
  getRIFBalance,
};
