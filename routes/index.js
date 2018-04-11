const express = require('express');
const router = express.Router();
const Promise = require('promise');
const binance = require('node-binance-api');
const mongoSvc = require('../service/mongoService');
const isTest = true;

binance.options({
  APIKEY: '0UYv2ciuSV7K6l88w9OvDfKpKGaWU6N0D0Xl2NEvp9J8EBPMfVYhndOLtuhkCjL9',
  APISECRET: 'hclcY8eByOj5AKDNaIGzvv3n1SjLDUCJ4uH91laWNbXqJXUfCCesnEG5oK7e4Em9',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: isTest // If you want to use sandbox mode where orders are simulated
});

/* needed setting variables. */
const coinUsdt = 'BTCUSDT';

/* 1. 메인 */
router.get('/', function (req, res, next) {
  binance.prices((err, ticker) => {
    if (err) {
      return res.render('error', {message: '현재 금액 api 호출 실패.'});
    }

    mongoSvc.getSetting(function (set) {
      if (!set) {
        set = {coin: null, limit: 0};
      }

      let data = {
        setCoin: set.coin,
        setLimit: set.limit,
        coinUsdt,
        coin: set.coin,
        coinUsdtTicker: ticker[coinUsdt],
        coinTicker: ticker[set.coin]
      }

      res.render('index', data);
    });
  });
});

/* 2. 설정 */
router.get('/setting', function (req, res, next) {
  mongoSvc.getSetting(function (set) {
    if (!set) {
      set = {coin: null, limit: 0};
    }

    res.render('setting', {set});
  });
});

router.post('/setting', function (req, res) {
  mongoSvc.setSetting({coin: req.body.coin, limit: req.body.limit}, function (ret) {
    let result = {code: -1, msg: null};

    if (ret) {
      result.code = 0;
    }

    res.send(result);
  });
});

router.post('/buy', function (req, res) {
  let result = {code: -1, msg: null};

  /* 1. usdt => btc 구매. */
  mongoSvc.getSetting(function (set) {
    if (!set) {
      return res.send(result);
    }

    binance.exchangeInfo(function(err, exInfo) {
      let usdtInfo = {};
      let coinInfo = {};

      for(var a in exInfo.symbols) {
        if (exInfo.symbols[a].symbol == coinUsdt) {
          usdtInfo.tickSize = exInfo.symbols[a].filters[0].tickSize;
          usdtInfo.stepSize = exInfo.symbols[a].filters[1].stepSize;
          if (usdtInfo.tickSize >= 1) {
            usdtInfo.priceFixed = 0;
          } else {
            usdtInfo.priceFixed = usdtInfo.tickSize.indexOf("1") -1;
          }

          if (usdtInfo.stepSize >= 1) {
            usdtInfo.quantityFixed = 0;
          } else {
            usdtInfo.quantityFixed = usdtInfo.stepSize.indexOf("1") -1;
          }
        }

        if (exInfo.symbols[a].symbol == set.coin) {
          coinInfo.tickSize = exInfo.symbols[a].filters[0].tickSize;
          coinInfo.stepSize = exInfo.symbols[a].filters[1].stepSize;
          if (coinInfo.tickSize >= 1) {
            coinInfo.priceFixed = 0;
          } else {
            coinInfo.priceFixed = coinInfo.tickSize.indexOf("1") -1;
          }

          if (coinInfo.stepSize >= 1) {
            coinInfo.quantityFixed = 0;
          } else {
            coinInfo.quantityFixed = coinInfo.stepSize.indexOf("1") -1;
          }
        }
      }

      binance.prices(coinUsdt, (err, ticker) => {
        let usdtQuantity = 0;
        let usdtPrice = 0;
        let usdtResult = false;

        if (err) {
          result.msg = err;
          return res.send(result);
        }

        usdtPrice = (parseFloat(ticker[coinUsdt]) + parseFloat(usdtInfo.tickSize)).toFixed(usdtInfo.priceFixed);
        usdtQuantity = (set.limit / usdtPrice).toFixed(usdtInfo.quantityFixed) - usdtInfo.stepSize;

        binance.buy(coinUsdt, usdtQuantity, usdtPrice, {type: 'LIMIT'}, (err, buyRes) => {
          if (err) {
            result.msg = err;
            return res.send(result);
          }

          if (buyRes.orderId) {
            usdtResult = true;
            result.msg = 'usdt 구매 번호 : ' + buyRes.orderId + ', 구매 가격 : ' + buyRes.price + ', 구매 수량 : ' + buyRes.executedQty;
          }

          if (isTest) {
            usdtResult = true;
          }

          /* 2. 실제 구매 코인 */
          if (usdtResult) {
            mongoSvc.saveHistory({
              orderId: buyRes.orderId,
              coinName: coinUsdt,
              coinPrice: usdtPrice,
              coinQuantity: usdtQuantity,
              totalPrice: usdtPrice * usdtQuantity
            });

            let coinPrice = 0;
            let coinQuantity = 0;

            binance.prices(set.coin, (err, ticker) => {
              if (err) {
                result.msg = err;
                return res.send(result);
              }

              coinPrice = (parseFloat(ticker[set.coin]) + parseFloat(coinInfo.tickSize)).toFixed(coinInfo.priceFixed);
              coinQuantity = (usdtQuantity / coinPrice).toFixed(coinInfo.quantityFixed) - coinInfo.stepSize;

              binance.buy(set.coin, coinQuantity, coinPrice, {type: 'LIMIT'}, (err, buyRes) => {
                if (err) {
                  result.msg = err;
                  return res.send(result);
                }

                if (buyRes.orderId) {
                  result.code = 0;
                  result.msg += '\n' + set.coin + ' 구매 번호 : ' + buyRes.orderId + ', 구매 가격 : ' + buyRes.price + ', 구매 수량 : ' + buyRes.executedQty;
                }

                if (isTest) {
                  result.code = 0;
                }

                if (result.code == 0) {
                  mongoSvc.saveHistory({
                    orderId: buyRes.orderId,
                    coinName: set.coin,
                    coinPrice,
                    coinQuantity,
                    totalPrice: coinPrice * coinQuantity
                  });
                }

                res.send(result);
              });
            });
          }
        });
      });
    });
  });
});

module.exports = router;
