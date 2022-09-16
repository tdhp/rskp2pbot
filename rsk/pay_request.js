const { User, PendingPayment } = require('../models');
const { handleReputationItems, getUserI18nContext } = require('../util');
const messages = require('../bot/messages');
const logger = require('../logger');
const { satsToWeis, rifsToWeis } = require('./utils')
const { releaseEscrowAccount, sendTransaction, sendRIFTransaction } = require('./wallet')

const payRequest = async ({ isRifOrder, userAddress, botAddress, amount, transactionId }) => {
  try {

    if (isRifOrder) {
      const amountInWeis = rifsToWeis(amount)
      return await sendRIFTransaction({
        to: userAddress,
        from: botAddress,
        amount: amountInWeis.toString(),
      })
    } else {
      const amountInWeis = satsToWeis(amount)
      return await sendTransaction({
        to: userAddress,
        from: botAddress,
        amount: amountInWeis + '',
        data: transactionId,
      })
    }
  } catch (error) {
    logger.error(`payRequest error: ${error ?? error.message ?? error.toString()}`);
    return undefined;
  }
};

const payToBuyer = async (bot, order) => {
  try {
    const receipt = await payRequest({
      isRifOrder: order.asset === 'rif',
      userAddress: order.buyer_address,
      botAddress: order.escrow_account.address,
      amount: order.amount,
    });

    const buyerUser = await User.findOne({ _id: order.buyer_id });
    const i18nCtx = await getUserI18nContext(buyerUser);
    const sellerUser = await User.findOne({ _id: order.seller_id });
    if (!!receipt) {
      logger.info(`Order ${order._id} - Crypto deposited in ${order.buyer_address}`);
      order.status = 'SUCCESS';
      order.gas_fee = receipt.gas_fee;

      await releaseEscrowAccount(order.escrow_account.address, receipt);

      await order.save();
      await handleReputationItems(buyerUser, sellerUser, order.amount);
      await messages.buyerReceivedSatsMessage(
        bot,
        buyerUser,
        sellerUser,
        i18nCtx
      );
      await messages.rateUserMessage(bot, buyerUser, order, i18nCtx);

    } else {
      await messages.invoicePaymentFailedMessage(bot, buyerUser, i18nCtx);
      const pp = new PendingPayment({
        amount: order.amount,
        asset: order.asset,
        payment_address: order.buyer_address,
        user_id: buyerUser._id,
        description: order.description,
        order_id: order._id,
      });
      await pp.save();
    }
  } catch (error) {
    logger.error(`payToBuyer catch: ${error}`);
  }
};

module.exports = {
  payRequest,
  payToBuyer,
};
