const mongoose = require('mongoose');

var buyHistorySchema = mongoose.Schema({
    orderId: 'string',
    coinName: 'string',
    coinPrice: 'number',
    coinQuantity: 'number',
    totalPrice: 'number',
    regDate: {type: Date, default: Date.now}
});

module.exports = mongoose.model('buyHistory', buyHistorySchema);
