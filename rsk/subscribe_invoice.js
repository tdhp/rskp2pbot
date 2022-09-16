const { User } = require('../models')
const { payToBuyer } = require('./pay_request')
const messages = require('../bot/messages')
const ordersActions = require('../bot/ordersActions')
const { getUserI18nContext, getEmojiRate, decimalRound } = require('../util')
const logger = require('../logger')
const { satsToWeis, rifsToWeis, printObjectProperties } = require('./utils')
const { findTransaction, getBalance, revertTransaction, getRIFBalance } = require('./wallet')
const orderQueries = require('../bot/orderQueries')
const { ethersProvider } = require('./connect')
const { incorrectAmountDepositedMessage } = require('../bot/messages')
const { ethers } = require('ethers')
const { computeRIFTransferMethodId } = require('./rif')

const monitorOrderEscrowAccount = async (bot, order, resub) => {

  if (!resub || order.status === 'WAITING_DEPOSIT') {
    // if (order.asset === 'rif') {
    //   await subscribeOnRifsDeposited(order._id, bot)
    // } else {
      await subscribeOnSatsDeposited(order._id, bot)
    // }
  }

  await subscribedOnFundReleased(order._id, bot)
}

function isOrderObsolete(order) {
  return order.status === 'EXPIRED' ||
    order.status === 'CANCELED' ||
    order.status === 'CANCELED_BY_ADMIN' ||
    order.status === 'CLOSED'
}

async function buildDepositTransactionSearchOptions(order, depositedAmount) {
  const escrowAccount = order.escrow_account
  const currentBlockNumber = await ethersProvider.getBlockNumber()
  const defaultNumberOfBlockToSearch = 100
  const numberOfBlockUntilPreviousDepositBlockNumber = escrowAccount.previous_deposit_block_number
    ? currentBlockNumber - escrowAccount.previous_deposit_block_number : defaultNumberOfBlockToSearch
  const maxNumberOfBlocksHistory = Math.min(numberOfBlockUntilPreviousDepositBlockNumber, defaultNumberOfBlockToSearch)
  let transactionData = undefined
  if (isRIFOrder(order)) {
    const transferFunctionMethodId = computeRIFTransferMethodId()
    const paddedAddress = ethers.utils.hexZeroPad(escrowAccount.address, 32)
    const paddedTokensBytes = ethers.utils.hexZeroPad(ethers.BigNumber.from(depositedAmount + '').toHexString(), 32)
    transactionData = ethers.utils.concat([transferFunctionMethodId, paddedAddress, paddedTokensBytes])
    return {
      maxNumberOfBlocksHistory,
      value: '0',
      transactionData,
    }
  } else {
    return {
      maxNumberOfBlocksHistory,
      value: depositedAmount,
      transactionData,
    }
  }

}

async function onDepositedFundsValid(bot, order, depositTransaction) {

  const buyerUser = await User.findOne({ _id: order.buyer_id })
  const sellerUser = await User.findOne({ _id: order.seller_id })
  const i18nCtxBuyer = await getUserI18nContext(buyerUser)
  const i18nCtxSeller = await getUserI18nContext(sellerUser)

  order.status = 'ACTIVE'
  if (order.type === 'sell') {
    await messages.onGoingTakeSellMessage(
      bot,
      sellerUser,
      buyerUser,
      order,
      i18nCtxBuyer,
      i18nCtxSeller,
    )
  } else if (order.type === 'buy') {
    order.status = 'WAITING_BUYER_ADDRESS'
    // We need the seller rating
    const stars = getEmojiRate(sellerUser.total_rating)
    const roundedRating = decimalRound(sellerUser.total_rating, -1)
    const rate = `${roundedRating} ${stars} (${sellerUser.total_reviews})`
    await messages.onGoingTakeBuyMessage(
      bot,
      sellerUser,
      buyerUser,
      order,
      i18nCtxBuyer,
      i18nCtxSeller,
      rate,
    )
  }
  order.invoice_held_at = Date.now()
  await order.save()

  const escrowAccount = order.escrow_account
  escrowAccount.previous_deposit_expected_amount = depositTransaction.value
  escrowAccount.previous_deposit_actual_amount = depositTransaction.value
  escrowAccount.previous_deposit_block_number = depositTransaction.blockNumber
  await escrowAccount.save()
}

async function validateDepositedFunds(bot, order, amount, depositTransaction) {

  let totalOrderAmount = Math.floor(order.amount + order.fee)
  const expectedAmountInWeis = isRIFOrder(order)
    ? rifsToWeis(totalOrderAmount) : satsToWeis(totalOrderAmount)

  if (amount.eq(expectedAmountInWeis)) {
    return true
  }

  const sellerUser = await User.findOne({ _id: order.seller_id })
  const i18nCtxSeller = await getUserI18nContext(sellerUser)

  logger.notice(`Fund deposited: ${amount} weis different than funds expected: ${expectedAmountInWeis} weis. Reverting transaction.`)
  await incorrectAmountDepositedMessage(
    bot,
    sellerUser,
    amount,
    depositTransaction.from,
    i18nCtxSeller
  )
  const escrowAccountAddress = order.escrow_account.address
  await revertTransaction({
    escrowAccountAddress,
    depositedAmount: amount,
    depositBlockNumber: depositTransaction.blockNumber,
  })

  return false
}

function isRIFOrder(order) {
  return order.asset === 'rif'
}

function subscribeOnSatsDeposited(orderId, bot) {

  setTimeout(async () => {
    try {

      const order = await orderQueries.getOrderById(orderId)
      if (isOrderObsolete(order)) {
        return
      }

      const escrowAccount = order.escrow_account
      const escrowAccountAddress = escrowAccount.address
      const escrowAccountPreviousBalance = isRIFOrder(order) ?
        escrowAccount.balance_rif : escrowAccount.balance_sats
      const escrowAccountCurrentBalance = isRIFOrder(order) ?
        await getRIFBalance(escrowAccountAddress) : await getBalance(escrowAccountAddress)
      const balanceChange = escrowAccountCurrentBalance.sub(escrowAccountPreviousBalance)

      if (balanceChange.lte(0)) {
        logger.debug(`Monitoring for fund deposited status: order "${orderId}" in "${order.status}" status, balance did not increase.`)
        subscribeOnSatsDeposited(orderId, bot)
        return
      }

      const depositTransactionResearchOptions = await buildDepositTransactionSearchOptions(order, balanceChange)
      logger.debug(`Monitoring for fund deposited status: order "${orderId}" by looking for transaction of value: ${depositTransactionResearchOptions.value} into address ${escrowAccountAddress}`)
      const depositTransaction = isRIFOrder(order)
        ? await findTransaction(process.env.RIF_CONTRACT_ADDRESS, depositTransactionResearchOptions)
        : await findTransaction(escrowAccountAddress, depositTransactionResearchOptions)
      if (depositTransaction === undefined) {
        logger.error(`subscribe_invoice: Could not find the deposit transaction of ${balanceChange} to the escrow account ${escrowAccountAddress}`)
        return
      }

      const confirmations = depositTransaction.confirmations
      if (confirmations < process.env.RSK_NUMBER_OF_CONFIRMATION_BLOCKS) {
        logger.debug(`Not enough confirmation yet for the deposit transaction.  Confirmations: ✅ ${confirmations}`)
        subscribeOnSatsDeposited(orderId, bot)
        return
      }
      logger.debug(`Deposit transaction found ${printObjectProperties(depositTransaction)}`)

      logger.info(
        `Order ${order._id} Invoice with escrow address: ${escrowAccount.address} received ${balanceChange}!`,
      )
      const validated = await validateDepositedFunds(bot, order, balanceChange, depositTransaction)
      if (!validated) {
        subscribeOnSatsDeposited(orderId, bot)
        return
      }

      await onDepositedFundsValid(bot, order, depositTransaction)
    } catch (e) {
      logger.error('subscribeOnFundDeposited catch: ', e)
    }
  }, 5000)
}

//Impossible to get any events of the RIF smart contract using ethers
// async function subscribeOnRifsDeposited(orderId, bot) {
//
//     try {
//       const order = await orderQueries.getOrderById(orderId)
//       if (isOrderObsolete(order)) {
//         return
//       }
//
//       const escrowAccount = order.escrow_account
//       const escrowAccountAddress = escrowAccount.address
//
//       const escrowAccountsInboundTransferFilter = rifErc20.filters.Transfer(null, escrowAccountAddress)
//       logger.debug(`Monitoring for RIFs fund to be deposited order "${orderId}" into ${escrowAccountAddress}`)
//
//       ethersProvider.on([
//         ethers.utils.id("Transfer(address,address,uint256)"),
//         null,
//         [
//           ethers.utils.hexZeroPad(escrowAccountAddress, 32),
//         ]
//       ], (log, event) => logger.debug(`ethersProvider on Transfer: log: ${printObjectProperties(log)}, event: ${printObjectProperties(event)}`))
//       rifErc20.on('Transfer', async (from, to, amount, event) => {
//
//         logger.info(
//           `Order ${order._id} Invoice with escrow address: ${escrowAccount.address} received ${amount}!`,
//         )
//         try {
//           event.removeListener(this)
//
//           const depositTransaction = event.getTransaction()
//           logger.debug(`Monitoring RIFs deposit received transaction: ${printObjectProperties(depositTransaction)}`)
//           const isValidTransaction = await validateDepositedFunds(bot, order, depositTransaction)
//           if (!isValidTransaction) {
//             await subscribeOnRifsDeposited(orderId, bot)
//             return
//           }
//
//           await onDepositedFundsValid(bot, order, depositTransaction)
//         } catch (e) {
//           logger.error(`on RIF deposit to escrow listener error: ${e}`)
//         }
//       })
//     } catch (e) {
//       logger.error('subscribeOnRifsDeposited catch: ', e)
//     }
// }

function subscribedOnFundReleased(orderId, bot) {

  setTimeout(async () => {
    try {

      const order = await orderQueries.getOrderById(orderId)
      if (isOrderObsolete(order)) {
        return
      }

      logger.debug(`Monitoring for fund release status: order "${orderId}" in "${order.status}" status`)
      const escrowAccountAddress = order.escrow_account.address
      if (order.status === 'RELEASED' || order.status === 'COMPLETED_BY_ADMIN') {

        logger.info(
          `Order ${orderId} - Deposited funds in escrow account: ${escrowAccountAddress} were released!`,
        )
        if (order.status === 'RELEASED') {
          order.status = 'PAID_HOLD_INVOICE'
          await order.save()
        }
        const buyerUser = await User.findOne({ _id: order.buyer_id })
        const sellerUser = await User.findOne({ _id: order.seller_id })
        // We need two i18n contexts to send messages to each user
        const i18nCtxBuyer = await getUserI18nContext(buyerUser)
        const i18nCtxSeller = await getUserI18nContext(sellerUser)
        await messages.releasedSatsMessage(
          bot,
          sellerUser,
          buyerUser,
          i18nCtxBuyer,
          i18nCtxSeller,
        )
        // If this is a range order, probably we need to created a new child range order
        const orderData = await ordersActions.getNewRangeOrderPayload(order)
        let i18nCtx
        if (orderData) {
          let user
          if (order.type === 'sell') {
            user = sellerUser
            i18nCtx = i18nCtxSeller
          } else {
            user = buyerUser
            i18nCtx = i18nCtxBuyer
          }

          const newOrder = await ordersActions.createOrder(
            i18nCtx,
            bot,
            user,
            orderData,
          )

          if (newOrder) {
            if (order.type === 'sell') {
              await messages.publishSellOrderMessage(
                bot,
                user,
                newOrder,
                i18nCtx,
                true,
              )
            } else {
              await messages.publishBuyOrderMessage(
                bot,
                user,
                newOrder,
                i18nCtx,
                true,
              )
            }
          }
        }
        // The seller get reputation after release
        await messages.rateUserMessage(bot, sellerUser, order, i18nCtxSeller)
        // We proceed to pay to buyer
        await payToBuyer(bot, order)
      } else if (!isOrderObsolete(order)) {
        subscribedOnFundReleased(orderId, bot)
      } else {
        logger.info(`Abandoning the monitoring of fund release of order "${orderId}" in status "${order.status}"`)
      }
    } catch (error) {
      logger.error('subscribedOnFundReleased catch: ', error)
      return false
    }
  }, 5000)
}

module.exports = monitorOrderEscrowAccount
