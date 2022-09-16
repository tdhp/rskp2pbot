const mongoose = require('mongoose');
const { Schema } = require('mongoose')

const OrderSchema = new mongoose.Schema({
  description: { type: String },
  asset: { type: String },
  amount: {
    // amount in satoshis, 1 sats = 10,000,000,000 weis
    type: Number,
    min: 0,
  },
  max_amount: {
    // max amount in fiat
    type: Number,
    min: 0,
  },
  min_amount: {
    // min amount in fiat
    type: Number,
    min: 0,
  },
  fee: { type: Number, min: 0 },
  bot_fee: { type: Number, min: 0 }, // bot MAX_FEE at the moment of order creation
  community_fee: { type: Number, min: 0 }, // community FEE_PERCENT at the moment of order creation
  gas_fee: { type: Number, min: 0, default: 0 },
  escrow_account: {
    type: Schema.Types.ObjectId,
    ref: 'EscrowAccount',
  },
  creator_id: { type: String },
  seller_id: { type: String },
  buyer_id: { type: String },
  buyer_address: { type: String },
  buyer_dispute: { type: Boolean, default: false },
  seller_dispute: { type: Boolean, default: false },
  buyer_cooperativecancel: { type: Boolean, default: false },
  seller_cooperativecancel: { type: Boolean, default: false },
  canceled_by: { type: String },
  status: {
    type: String,
    enum: [
      'WAITING_DEPOSIT', // buyer waiting for seller pay hold invoice
      'WAITING_BUYER_ADDRESS', // seller waiting for buyer add invoice where will receive sats
      'PENDING', // order published on CHANNEL but not taken yet
      'ACTIVE', //  order taken
      'FIAT_SENT', // buyer indicates the fiat payment is already done
      'RELEASED', //seller released the deposit in escrow
      'CLOSED', // order closed
      'DISPUTE', // one of the parties started a dispute
      'CANCELED',
      'SUCCESS',
      'PAID_HOLD_INVOICE', // seller released funds
      'CANCELED_BY_ADMIN',
      'EXPIRED', // Expired orders, stated changed by a job
      'COMPLETED_BY_ADMIN',
    ],
  },
  type: { type: String },
  fiat_amount: { type: Number, min: 0.1 }, // amount in fiat
  fiat_code: { type: String },
  payment_method: { type: String },
  created_at: { type: Date, default: Date.now },
  invoice_held_at: { type: Date },
  taken_at: { type: Date },
  tg_chat_id: { type: String },
  tg_order_message: { type: String },
  tg_channel_message1: { type: String },
  range_parent_id: { type: String }, // If the order have a parent we save the Id
  price_from_api: { type: Boolean },
  price_margin: { type: Number, default: 0 },
  calculated: { type: Boolean, default: false },
  admin_warned: { type: Boolean, default: false }, // We set this to true when the bot warns admins the order is about to expire
  paid_hold_buyer_invoice_updated: { type: Boolean, default: false }, // We set this to true when buyer executes /setinvoice on a order PAID_HOLD_INVOICE
  community_id: { type: String },
});

module.exports = mongoose.model('Order', OrderSchema);
