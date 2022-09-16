const monitorOrderEscrowAccount = require('./subscribe_invoice');
const logger = require('../logger');
const orderQueries = require('../bot/orderQueries')

const resubscribeInvoices = async bot => {
  try {
    let invoicesReSubscribed = 0;
    const incompleteOrders = await orderQueries.getOrdersByQuery({
      $or: [{
        status: 'WAITING_DEPOSIT',
      }, {
        status: 'WAITING_BUYER_ADDRESS',
      }, {
        status: 'ACTIVE',
      }],
    });
    if (Array.isArray(incompleteOrders) && incompleteOrders.length > 0) {
      for (const order of incompleteOrders) {
        if (!!order && !!order.escrow_account) {
          logger.info(
            `Re-subscribing Incomplete Order ${order._id} - Status: "${order.status}"!`
          );
          await monitorOrderEscrowAccount(bot, order, true);
          invoicesReSubscribed++;
        }
      }
    }
    logger.info(`Invoices resubscribed: ${invoicesReSubscribed}`);
  } catch (error) {
    logger.error(`ResuscribeInvoice catch: ${error}`);
    return false;
  }
};

module.exports = resubscribeInvoices;
