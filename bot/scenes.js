const { Scenes } = require('telegraf');
const { toValidLowerCaseAddress } = require('./validations');
const { PendingPayment } = require('../models');
const { waitPayment, addInvoice, showHoldInvoice } = require('./commands');
const { getCurrency, getUserI18nContext } = require('../util');
const messages = require('./messages');
const logger = require('../logger');
const orderQueries = require('./orderQueries')

const addBuyerAddressWizard = new Scenes.WizardScene(
  'ADD_BUYER_ADDRESS_WIZARD_SCENE_ID',
  async ctx => {
    try {
      const { order } = ctx.wizard.state;
      const expirationTime =
        parseInt(process.env.WINDOW_TO_DEPOSIT_DEPOSIT_FUNDS_IN_ESCROW_ACCOUNT) / 60;
      const currency = getCurrency(order.fiat_code);
      const symbol =
        !!currency && !!currency.symbol_native
          ? currency.symbol_native
          : order.fiat_code;
      await messages.wizardAddInvoiceInitMessage(
        ctx,
        order,
        symbol,
        expirationTime
      );

      order.status = 'WAITING_BUYER_ADDRESS';
      await order.save();
      return ctx.wizard.next();
    } catch (error) {
      logger.error(error);
    }
  },
  async ctx => {
    try {
      if (ctx.message === undefined) return ctx.scene.leave();
      if (ctx.message.document)
        return await ctx.reply(ctx.i18n.t('must_enter_text'));

      const buyerAddress = ctx.message.text.trim();
      let { bot, buyer, seller, order } = ctx.wizard.state;
      // We get an updated order from the DB
      order = await orderQueries.getOrderById(order._id);
      if (!order) {
        await ctx.reply(ctx.i18n.t('generic_error'));
        return ctx.scene.leave();
      }

      const res = await toValidLowerCaseAddress(ctx, buyerAddress);
      if (!res.success) {
        return;
      }

      if (order.status === 'EXPIRED') {
        await messages.orderExpiredMessage(ctx);
        return ctx.scene.leave();
      }

      if (order.status !== 'WAITING_BUYER_ADDRESS') {
        await messages.cantAddInvoiceMessage(ctx);
        return ctx.scene.leave();
      }

      await waitPayment(ctx, bot, buyer, seller, order, res.allLowerCaseAddress);

      return ctx.scene.leave();
    } catch (error) {
      logger.error(error);
      ctx.scene.leave();
    }
  }
);

const addInvoicePHIWizard = new Scenes.WizardScene(
  'ADD_INVOICE_PHI_WIZARD_SCENE_ID',
  async ctx => {
    try {
      const { buyer, order } = ctx.wizard.state;
      logger.debug(`addInvoicePHIWizard for order: "${order._id}"`)
      const i18nCtx = await getUserI18nContext(buyer);
      await messages.sendMeAnInvoiceMessage(ctx, order.amount, i18nCtx);

      return ctx.wizard.next();
    } catch (error) {
      logger.error(error);
    }
  },
  async ctx => {
    try {
      if (ctx.message === undefined) return ctx.scene.leave();
      if (ctx.message.document)
        return await ctx.reply(ctx.i18n.t('must_enter_text'));

      const buyerAddress = ctx.message.text.trim();
      let { buyer, order } = ctx.wizard.state;
      // We get an updated order from the DB
      order = await orderQueries.getOrderById(order._id);
      if (!order) {
        await ctx.reply(ctx.i18n.t('generic_error'));
        return ctx.scene.leave();
      }

      const res = await toValidLowerCaseAddress(ctx, buyerAddress);
      if (!res.success) {
        logger.notice(`new buyer address "${buyerAddress}" for order "${order._id}" is invalid`)
        await messages.invalidAddress(ctx);
        return ctx.scene.reenter();
      }

      const isScheduled = await PendingPayment.findOne({
        order_id: order._id,
        attempts: { $lt: process.env.PAYMENT_ATTEMPTS },
        is_invoice_expired: false,
      });

      if (!!isScheduled)
        return await messages.invoiceAlreadyUpdatedMessage(ctx);

      if (!order.paid_hold_buyer_invoice_updated) {
        logger.debug(`Creating pending payment for order ${order._id}`);
        order.paid_hold_buyer_invoice_updated = true;
        const pp = new PendingPayment({
          amount: order.amount,
          asset: order.asset,
          payment_address: res.allLowerCaseAddress,
          user_id: buyer._id,
          description: order.description,
          order_id: order._id,
        });
        await order.save();
        await pp.save();
        await messages.invoiceUpdatedPaymentWillBeSendMessage(ctx);
      } else {
        await messages.invoiceAlreadyUpdatedMessage(ctx);
      }

      return ctx.scene.leave();
    } catch (error) {
      logger.error(error);
      ctx.scene.leave();
    }
  }
);

const addFiatAmountWizard = new Scenes.WizardScene(
  'ADD_FIAT_AMOUNT_WIZARD_SCENE_ID',
  async ctx => {
    try {
      const { order } = ctx.wizard.state;
      const currency = getCurrency(order.fiat_code);
      const action =
        order.type === 'buy' ? ctx.i18n.t('receive') : ctx.i18n.t('send');
      const currencyName =
        !!currency && !!currency.name_plural
          ? currency.name_plural
          : order.fiat_code;
      await messages.wizardAddFiatAmountMessage(
        ctx,
        currencyName,
        action,
        order
      );

      return ctx.wizard.next();
    } catch (error) {
      logger.error(error);
    }
  },
  async ctx => {
    try {
      const { bot, order } = ctx.wizard.state;

      if (ctx.message === undefined) return ctx.scene.leave();

      const fiatAmount = parseInt(ctx.message.text.trim());
      if (!Number.isInteger(fiatAmount))
        return await messages.wizardAddFiatAmountWrongAmountMessage(ctx, order);

      if (fiatAmount < order.min_amount || fiatAmount > order.max_amount)
        return await messages.wizardAddFiatAmountWrongAmountMessage(ctx, order);

      order.fiat_amount = fiatAmount;
      const currency = getCurrency(order.fiat_code);
      await messages.wizardAddFiatAmountCorrectMessage(
        ctx,
        currency,
        fiatAmount
      );

      if (order.type === 'sell') {
        await addInvoice(ctx, bot, order);
      } else {
        await showHoldInvoice(ctx, bot, order);
      }

      return ctx.scene.leave();
    } catch (error) {
      logger.error(error);
    }
  }
);

module.exports = {
  addBuyerAddressWizard,
  addFiatAmountWizard,
  addInvoicePHIWizard,
};
