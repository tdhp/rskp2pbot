const { Community } = require('../models');
const logger = require('../logger');
const orderQueries = require('../bot/orderQueries')

const calculateEarnings = async () => {
  try {
    const orders = await orderQueries.getOrdersByQuery({
      status: 'SUCCESS',
      community_id: { $ne: null },
      calculated: false,
    });
    const earningsMap = new Map();
    for (const order of orders) {
      const communityFee = order.community_fee
      const earnings = earningsMap.get(order.community_id) || [0, 0];
      earningsMap.set(order.community_id, [
        earnings[0] + communityFee,
        earnings[1] + 1,
      ]);
      order.calculated = true;
      await order.save();
    }
    for (const [communityId, earnings] of earningsMap) {
      const community = await Community.findById(communityId);
      const amount = earnings[0];
      community.earnings = community.earnings + amount;
      community.orders_to_redeem = community.orders_to_redeem + earnings[1];
      await community.save();
      logger.info(
        `New earnings for community Id: ${community.id} sats: ${amount} orders calculated: ${earnings[1]}`
      );
    }
  } catch (error) {
    const message = error.toString();
    logger.error(`calculateEarnings catch error: ${message}`);
  }
};

module.exports = calculateEarnings;
