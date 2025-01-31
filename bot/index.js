const { initialize, start } = require('./start');
const {
  createOrder,
  getOrder,
  getNewRangeOrderPayload,
} = require('./ordersActions');
const {
  validateSellOrder,
  validateBuyOrder,
  validateUser,
  toValidLowerCaseAddress,
  validateTakeSellOrder,
  validateTakeBuyOrder,
  validateReleaseOrder,
  validateDisputeOrder,
} = require('./validations');
const {
  startMessage,
  initBotErrorMessage,
  fundDepositRequestMessage,
  sellOrderCorrectFormatMessage,
  buyOrderCorrectFormatMessage,
  minimunAmountInvoiceMessage,
  expiredInvoiceMessage,
  requiredAddressInvoiceMessage,
  publishBuyOrderMessage,
  invalidOrderMessage,
  invalidTypeOrderMessage,
  alreadyTakenOrderMessage,
  invalidDataMessage,
  beginTakeBuyMessage,
  notActiveOrderMessage,
  publishSellOrderMessage,
  onGoingTakeBuyMessage,
  pendingSellMessage,
  pendingBuyMessage,
  beginDisputeMessage,
  notOrderMessage,
  customMessage,
  nonHandleErrorMessage,
} = require('./messages');

module.exports = {
  initialize,
  start,
  createOrder,
  getOrder,
  validateSellOrder,
  validateBuyOrder,
  validateUser,
  toValidLowerCaseAddress,
  validateTakeSellOrder,
  validateTakeBuyOrder,
  validateReleaseOrder,
  validateDisputeOrder,
  startMessage,
  initBotErrorMessage,
  fundDepositRequestMessage,
  sellOrderCorrectFormatMessage,
  buyOrderCorrectFormatMessage,
  minimunAmountInvoiceMessage,
  expiredInvoiceMessage,
  requiredAddressInvoiceMessage,
  publishBuyOrderMessage,
  invalidOrderMessage,
  invalidTypeOrderMessage,
  alreadyTakenOrderMessage,
  invalidDataMessage,
  beginTakeBuyMessage,
  notActiveOrderMessage,
  publishSellOrderMessage,
  onGoingTakeBuyMessage,
  pendingSellMessage,
  pendingBuyMessage,
  beginDisputeMessage,
  notOrderMessage,
  customMessage,
  nonHandleErrorMessage,
  getNewRangeOrderPayload,
};
