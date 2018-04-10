const mongoose = require('mongoose');

var settingSchema = mongoose.Schema({
    coin: 'string',
    limit: 'number'
});

module.exports = mongoose.model('setting', settingSchema);
