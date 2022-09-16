const { payRequest } = require('../rsk');
const { PendingPayment, User, Community, EscrowAccount } = require('../models');
const messages = require('../bot/messages');
const { getUserI18nContext } = require('../util');
const logger = require('../logger');
const orderQueries = require('../bot/orderQueries')

exports.attemptPendingPayments = async bot => {
  const pendingPayments = await PendingPayment.find({
    paid: false,
    attempts: { $lt: process.env.PAYMENT_ATTEMPTS },
    is_invoice_expired: false,
    community_id: null,
  });
  for (const pending of pendingPayments) {
    const order = await orderQueries.getOrderById(pending.order_id);
    try {
      pending.attempts++;
      if (order.status === 'SUCCESS') {
        pending.paid = true;
        await pending.save();
        logger.info(`Order id: ${order._id} was already paid`);
        return;
      }

      if (pending.retrying) return

      pending.retrying = true

      const receipt = await payRequest({
        isRifOrder: order.asset === 'rif',
        userAddress: pending.payment_address,
        botAddress: order.escrow_account.address,
        amount: pending.amount,
      });
      const buyerUser = await User.findOne({ _id: order.buyer_id });
      const i18nCtx = await getUserI18nContext(buyerUser);

      if (!!receipt) {
        order.status = 'SUCCESS';
        order.gas_fee = receipt.gas_fee;
        pending.paid = true;
        pending.paid_at = new Date().toISOString();
        // We add a new completed trade for the buyer
        buyerUser.trades_completed++;
        await buyerUser.save();
        // We add a new completed trade for the seller
        const sellerUser = await User.findOne({ _id: order.seller_id });
        sellerUser.trades_completed++;
        sellerUser.save();
        logger.info(`Payment of order: ${pending.order_id} completed`);
        await messages.toAdminChannelPendingPaymentSuccessMessage(
          bot,
          buyerUser,
          order,
          pending,
          receipt,
          i18nCtx
        );
        await messages.toBuyerPendingPaymentSuccessMessage(
          bot,
          buyerUser,
          order,
          receipt,
          i18nCtx
        );
        await messages.rateUserMessage(bot, buyerUser, order, i18nCtx);
      } else {
        if (pending.attempts === parseInt(process.env.PAYMENT_ATTEMPTS)) {
          order.paid_hold_buyer_invoice_updated = false;
          await messages.toBuyerPendingPaymentFailedMessage(
            bot,
            buyerUser,
            order,
            i18nCtx
          );
        }
        await messages.toAdminChannelPendingPaymentFailedMessage(
          bot,
          buyerUser,
          order,
          pending,
          i18nCtx
        );
      }
      pending.retrying = false;
    } catch (error) {
      const message = error.toString();
      logger.error(`attemptPendingPayments catch error: ${message}`);
    } finally {
      await order.save();
      await pending.save();
    }
  }
};

exports.attemptCommunitiesPendingPayments = async bot => {
  const pendingPayments = await PendingPayment.find({
    paid: false,
    attempts: { $lt: process.env.PAYMENT_ATTEMPTS },
    is_invoice_expired: false,
    community_id: { $ne: null },
  });

  for (const pending of pendingPayments) {
    const escrowAccounts = await EscrowAccount.find({
      balance: { $gt: pending.amount },
    }).sort({ 'balance': 'asc' });

    if (escrowAccounts.length === 0) {
      await bot.telegram.sendMessage(
        user.tg_id,
        i18nCtx.t('not_enough_fund_for_payment_of_earnings', {
          id: community.id,
          amount: pending.amount,
          paymentSecret: receipt.transactionHash,
        })
      );
      return;
    }

    const lowestBalanceEscrowAccount = escrowAccounts[0]

    try {
      pending.attempts++;

      // If the payments is on flight we don't do anything
      if (pending.retrying) return;

      pending.retrying = true;
      const receipt = await payRequest({
        isRifOrder: pending.asset === 'rif',
        userAddress: pending.payment_address,
        botAddress: lowestBalanceEscrowAccount.address,
        amount: pending.amount,
      });
      const user = await User.findById(pending.user_id);
      const i18nCtx = await getUserI18nContext(user);

      const community = await Community.findById(pending.community_id);
      if (!!receipt) {
        pending.paid = true;
        pending.paid_at = new Date().toISOString();
        pending.gas_fee = receipt.gas_fee;

        // Reset the community's values
        community.earnings = 0;
        community.orders_to_redeem = 0;
        await community.save();
        logger.info(
          `Community ${community.id} withdrew ${pending.amount} sats, transaction with hash: ${receipt.transactionHash} was paid`
        );
        await bot.telegram.sendMessage(
          user.tg_id,
          i18nCtx.t('pending_payment_success', {
            id: community.id,
            amount: pending.amount,
            paymentSecret: receipt.transactionHash,
          })
        );
      } else {
        if (pending.attempts === parseInt(process.env.PAYMENT_ATTEMPTS)) {
          await bot.telegram.sendMessage(
            user.tg_id,
            i18nCtx.t('pending_payment_failed', {
              attempts: pending.attempts,
            })
          );
        }
        logger.error(
          `Community ${community.id}: Withdraw failed after ${pending.attempts} attempts, amount ${pending.amount} sats`
        );
      }
      pending.retrying = false;
    } catch (error) {
      logger.error(`attemptCommunitiesPendingPayments catch error: ${error}`);
    } finally {
      await pending.save();
    }
  }
};
