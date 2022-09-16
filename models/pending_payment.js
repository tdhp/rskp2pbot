const mongoose = require('mongoose');

const PendingPaymentSchema = new mongoose.Schema({
  description: { type: String },
  asset: { type: String },
  amount: {
    type: Number,
    min: 0.1,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value',
    },
  },
  attempts: { type: Number, min: 0, default: 0 },
  paid: { type: Boolean, default: false },
  retrying: { type: Boolean, default: false },
  is_invoice_expired: { type: Boolean, default: false },
  payment_address: { type: String },
  hash: { type: String },
  created_at: { type: Date, default: Date.now },
  paid_at: { type: Date },
  user_id: { type: String },
  order_id: { type: String },
  community_id: { type: String },
  gas_fee: { type: Number, min: 0, default: 0 },
});

module.exports = mongoose.model('PendingPayment', PendingPaymentSchema);
