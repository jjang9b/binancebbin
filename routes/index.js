const express = require('express');
const router = express.Router();
const Promise = require('promise');
const binance = require('node-binance-api');
const mongoSvc = require('../service/mongoService');
const isTest = true;
const maxPrice = 50000;

binance.options({
  APIKEY: '',
  APISECRET: '',
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
  let result = {code: -1, msg: null};

  binance.exchangeInfo(function(err, exInfo) {
    binance.prices((err, ticker) => {
      if (!ticker[req.body.coin]) {
        result.msg = '존재하지 않는 코인입니다.';
        return res.send(result);
      }

      let usdtQuantity = 0;

      for(var a in exInfo.symbols) {
        if (exInfo.symbols[a].symbol == coinUsdt) {
          let tickSize = exInfo.symbols[a].filters[0].tickSize;
          let stepSize = exInfo.symbols[a].filters[1].stepSize;
          let minNotional = exInfo.symbols[a].filters[2].minNotional;
          let priceFixed = 0;
          let quantityFixed = 0;

          if (tickSize >= 1) {
            priceFixed = 0;
          } else {
            priceFixed = tickSize.indexOf("1") -1;
          }

          if (stepSize >= 1) {
            quantityFixed = 0;
          } else {
            quantityFixed = stepSize.indexOf("1") -1;
          }

          let usdtPrice = (parseFloat(ticker[coinUsdt]) + parseFloat(tickSize * 2)).toFixed(priceFixed);
          usdtQuantity = ((req.body.limit / usdtPrice) - (stepSize * 2)).toFixed(quantityFixed);

          if (minNotional > (usdtPrice * usdtQuantity)) {
            result.msg = 'USDT 최소 총 구매 금액보다 작습니다.'
              + '\n(BTC-USDT 현재가 * 수량 기준) USDT 수량을 늘려주세요.'
              + '\n현재 설정 총 구매 금액 : ' + (usdtPrice * usdtQuantity)
              + '\n최소 총 구매 금액 : ' + minNotional;
            return res.send(result);
          }
        }
      }

      for(var a in exInfo.symbols) {
        if (exInfo.symbols[a].symbol == req.body.coin) {
          let tickSize = exInfo.symbols[a].filters[0].tickSize;
          let stepSize = exInfo.symbols[a].filters[1].stepSize;
          let minNotional = exInfo.symbols[a].filters[2].minNotional;
          let priceFixed = 0;
          let quantityFixed = 0;

          if (tickSize >= 1) {
            priceFixed = 0;
          } else {
            priceFixed = tickSize.indexOf("1") -1;
          }

          if (stepSize >= 1) {
            quantityFixed = 0;
          } else {
            quantityFixed = stepSize.indexOf("1") -1;
          }

          let price = (parseFloat(ticker[req.body.coin]) + parseFloat(tickSize * 2)).toFixed(priceFixed);
          quantity = ((usdtQuantity / price) - (stepSize * 2)).toFixed(quantityFixed);

          if (minNotional > (price * quantity)) {
            result.msg = req.body.coin + ' 코인을 구매하기 위한 총 최소 금액보다 작습니다.\n'
              + '\nUSDT => BTC로 구매한 수량으로 예상한 총 금액입니다.'
              + '\n현재 설정 총 구매 금액 : ' + (price * quantity)
              + '\n최소 총 구매 금액 : ' + minNotional;

            return res.send(result);
          }
        }
      }

      mongoSvc.setSetting({coin: req.body.coin, limit: req.body.limit}, function (ret) {
        if (ret) {
          result.code = 0;
        }

        res.send(result);
      });
    });
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

        usdtPrice = (parseFloat(ticker[coinUsdt]) + parseFloat(usdtInfo.tickSize * 2)).toFixed(usdtInfo.priceFixed);
        usdtQuantity = ((set.limit / usdtPrice) - (usdtInfo.stepSize * 2)).toFixed(usdtInfo.quantityFixed);

        if (usdtPrice * usdtQuantity > maxPrice) {
          result.msg = '[에러] 최대 구매 금액을 넘었습니다.';
          return res.send(result);
        }

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

              coinPrice = (parseFloat(ticker[set.coin]) + parseFloat(coinInfo.tickSize * 2)).toFixed(coinInfo.priceFixed);
              coinQuantity = ((usdtQuantity / coinPrice) - (coinInfo.stepSize * 2)).toFixed(coinInfo.quantityFixed);

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
