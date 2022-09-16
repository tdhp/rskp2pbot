const { Community, Order, User } = require('../../../models');

const getOrdersNDays = async (days, communityId) => {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - days * 24);
  const filter = {
    status: 'SUCCESS',
    created_at: {
      $gte: yesterday,
    },
  };
  if (communityId) filter.community_id = communityId;

  return Order.count(filter);
};

const getVolumeNDays = async (days, communityId) => {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - days * 24);
  const filter = {
    status: 'SUCCESS',
    created_at: {
      $gte: yesterday,
    },
  };
  if (communityId) filter.community_id = communityId;
  const [row] = await Order.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: null,
        amount: { $sum: '$amount' },
        gas_fee: { $sum: '$payment_fee' },
        fee: { $sum: '$fee' },
      },
    },
  ]);
  if (!row) return 0;

  return row.amount;
};

exports.onCommunityInfo = async ctx => {
  const commId = ctx.match[1];
  const community = await Community.findById(commId);
  const userCount = await User.count({ default_community_id: commId });
  const orderCount = await getOrdersNDays(1, commId);
  const volume = await getVolumeNDays(1, commId);

  const rows = [];
  rows.push([
    { text: ctx.i18n.t('orders') + ' 24hs', callback_data: 'none' },
    { text: orderCount, callback_data: 'none' },
  ]);
  rows.push([
    { text: ctx.i18n.t('volume') + ' 24hs', callback_data: 'none' },
    { text: `${volume} sats`, callback_data: 'none' },
  ]);
  rows.push([
    { text: ctx.i18n.t('users'), callback_data: 'none' },
    { text: userCount, callback_data: 'none' },
  ]);
  rows.push([
    {
      text: ctx.i18n.t('use_default'),
      callback_data: `setCommunity_${commId}`,
    },
  ]);
  const text = `${community.name}\n${community.group}`;
  await ctx.reply(text, {
    reply_markup: { inline_keyboard: rows },
  });
};

exports.onSetCommunity = async ctx => {
  const tgId = ctx.update.callback_query.from.id;
  const defaultCommunityId = ctx.match[1];
  await User.findOneAndUpdate(
    { tg_id: tgId },
    { default_community_id: defaultCommunityId }
  );
  await ctx.reply(ctx.i18n.t('operation_successful'));
};

exports.withdrawEarnings = async ctx => {
  ctx.deleteMessage();
  const community = await Community.findById(ctx.match[1]);
  ctx.scene.enter('ADD_EARNINGS_INVOICE_WIZARD_SCENE_ID', {
    community,
  });
};
