const mongoSvc = require('../service/mongoService');
const express = require('express');
const router = express.Router();
const moment = require('moment');

router.get('/', function (req, res, next) {
  mongoSvc.list(result => {
    res.render('history', {result, moment});
  });
});

module.exports = router;
