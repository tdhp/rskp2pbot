const { ObjectId } = require('mongoose').Types;
const { Order } = require('../models')
const logger = require('../logger')

const getOrderById = async (orderId) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      return false;
    }

    const order = await Order.findOne({ _id: orderId }).populate('escrow_account');
    if (!order) {
      return false;
    }

    return order;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

const getOrdersByQuery = async (where) => {
  try {
    const orders = await Order.find(where).populate('escrow_account');
    if (!orders) {
      return false;
    }

    return orders;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

const getOrderByQuery = async (where) => {
  try {
    const order = await Order.findOne(where).populate('escrow_account');
    if (!order) {
      return false;
    }

    return order;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

module.exports = {
  getOrderById,
  getOrderByQuery,
  getOrdersByQuery,
};
