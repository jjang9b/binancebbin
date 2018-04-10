const buyHistory = require('../model/buyHistory');
const setting = require('../model/setting');

let mongoService = {
  saveHistory: function (data) {
    var history = new buyHistory(data);

    history.save(function (err, data) {
      if (err) {
        console.log(err);
      }
    });
  },

  list: function (callback) {
    buyHistory.find({}).sort({regDate: -1}).exec(function (err, result) {
      callback(result);
    });
  },

  getSetting: function (callback) {
    setting.findOne(function (err, result) {
      callback(result);
    });
  },

  setSetting: function (data, callback) {
    setting.findOneAndUpdate({}, {$set: data}, {upsert: true}, function (err, result) {
      if (err) {
        console.log(err);
        return;
      }

      callback(true);
    });
  }
}

module.exports = mongoService;
