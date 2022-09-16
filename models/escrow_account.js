const mongoose = require('mongoose')
const { Schema } = require('mongoose')

const EscrowAccountSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    index: {
      unique: true,
    },
  },
  secret: { type: String, required: true },
  status: {
    type: String,
    enum: [
      'AVAILABLE',
      'BUSY', // being used for an order
    ],
  },
  previous_deposit_expected_amount: { type: Number, min: 0, default: null }, /*weis*/
  previous_deposit_actual_amount: { type: Number, min: 0, default: null }, /*weis*/
  previous_deposit_block_number: { type: Number, min: 0, default: null },
  balance_sats: {
    type: Number,
    min: 0,
    default: 0,
    required: true,
    index: {
      partialFilterExpression: { balance: { $gt: 10000000000 } }  /*10 MWeis = 1 sats*/
    }
  },
  balance_rif: {
    type: Number,
    min: 0,
    default: 0,
    required: true,
    index: {
      partialFilterExpression: { balance: { $gt: 10000000000 } }  /*10 MWeis = 1 sats*/
    }
  },
  orders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order',
  }],
  created_at: { type: Date, default: Date.now },
})

module.exports = mongoose.model('EscrowAccount', EscrowAccountSchema)
