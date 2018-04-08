const express = require('express');
const router = express.Router();
const Promise = require('promise');
const binance = require('node-binance-api');
const isTest = true;

binance.options({
  APIKEY: '0UYv2ciuSV7K6l88w9OvDfKpKGaWU6N0D0Xl2NEvp9J8EBPMfVYhndOLtuhkCjL9',
  APISECRET: 'hclcY8eByOj5AKDNaIGzvv3n1SjLDUCJ4uH91laWNbXqJXUfCCesnEG5oK7e4Em9',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: isTest // If you want to use sandbox mode where orders are simulated
});

/* needed setting variables. */
const coinUsdt = 'BTCUSDT';
const coin = 'IOSTBTC';
const myUsdt = 100;

/* GET home page. */
router.get('/', function (req, res, next) {
  binance.prices((err, ticker) => {
    if (err) {
      return res.render('error', {message: '현재 금액 api 호출 실패.'});
    }

    let data = {
      coinUsdt,
      coin,
      coinUsdtTicker: ticker[coinUsdt],
      coinTicker: ticker[coin]
    }

    res.render('index', data);
  });
});

router.get('/h', function (req, res, next) {
  binance.trades(coin, (err, trades, symbol) => {
    if (err) {
      return res.render('error', {message: coin + ' 구매 내역 api 호출 실패.'});
    }

    let data = {
      coin,
      trades
    }

    res.render('history', data);
  });
});

router.post('/buy', function (req, res) {
  let result = {code: -1, msg: null};

  /* 1. usdt => btc 구매. */
  binance.prices(coinUsdt, (err, ticker) => {
    let usdtQuantity = 0;
    let usdtPrice = 0;

    if (err) {
      result.msg = err;
      return res.send(result);
    }

    usdtPrice = (parseFloat(ticker[coinUsdt]) + parseFloat(ticker[coinUsdt] * 0.0001)).toFixed(2);
    usdtQuantity = (myUsdt / usdtPrice).toFixed(6);

    binance.buy(coinUsdt, usdtQuantity, usdtPrice, {type: 'LIMIT'}, (err, buyRes) => {
      if (err) {
        result.msg = err;
        return res.send(result);
      }

      if (buyRes.orderId) {
        result.code = 0;
        result.msg = 'usdt 구매 번호 : ' + buyRes.orderId + ', 구매 가격 : ' + buyRes.price + ', 구매 수량 : ' + buyRes.executedQty;
      }

      if (isTest) {
        result.code = 0;
      }

      console.log(usdtPrice);
      console.log(usdtQuantity);

      /* 2. 실제 구매 코인 */
      if (result.code == 0) {
        let coinPrice = 0;
        let coinQuantity = 0;

        binance.prices(coin, (err, ticker) => {
          if (err) {
            result.msg = err;
            return res.send(result);
          }

          coinPrice = parseFloat(ticker[coin]) + parseFloat(ticker[coin] * 0.0001);
          coinQuantity = (usdtQuantity / coinPrice).toFixed(6);

          console.log(coinPrice);
          console.log(coinQuantity);

          binance.buy(coin, coinQuantity, coinPrice, {type: 'LIMIT'}, (err, buyRes) => {
            if (err) {
              result.msg = err;
              return res.send(result);
            }

            if (buyRes.orderId) {
              result.code = 0;
              result.msg += '\n' + coin + ' 구매 번호 : ' + buyRes.orderId + ', 구매 가격 : ' + buyRes.price + ', 구매 수량 : ' + buyRes.executedQty;
            }

            if (isTest) {
              result.code = 0;
            }

            res.send(result);
          });
        });
      }
    });
  });
});

module.exports = router;
