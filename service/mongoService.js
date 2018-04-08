const buyHistory = require('../model/buyHistory');

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
  }
}

module.exports = mongoService;
