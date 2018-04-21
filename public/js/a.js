(function(){
  "use strict";

  $(document).ready(function () {
    var DATA = {
      buy: false
    }

    var DOM = {
      iCoin: $('#i_coin'),
      iAmount: $('#i_amount'),
      btnBuy: $('#btn_buy'),
      btnSetting: $('#btn_setting'),
      aReload: $('#a_reload'),
      tabHistory: $('#t_history'),
    }

    if (DOM.tabHistory.length > 0) {
      DOM.tabHistory.DataTable({
        "order": [[0, 'dsesc']]
      });
    }

    DOM.aReload.click(function () {
        location.reload();
    });

    DOM.btnSetting.click(function () {
      if (DOM.iCoin.val() == '') {
        return alert('코인 이름을 정확히 입력하세요.');
      }

      if (DOM.iAmount.val() == '') {
        return alert('USDT 수량을 입력하세요.');
      }

      var coin = DOM.iCoin.val().toUpperCase() + 'BTC';

      $.post('/setting', {coin, limit: DOM.iAmount.val()}, function (ret) {
        if (ret.code == 0) {
          alert('정상적으로 설정 완료했습니다!');
          return location.href = '/';
        }

        return alert('[에러] 설정 오류가 발생했습니다.\n' + ret.msg);
      }, 'json').fail(function (err) {
        alert('[에러] 설정 통신 오류!');
      });
    });

    DOM.btnBuy.click(function () {
      if (DATA.buy) {
        return alert('구매 진행 중입니다.');
      }

      var _this = $(this);

      DATA.buy = true;
      _this.prop('disabled', true).removeClass('color-black').addClass('color-gray');

      $.post('/buy', {coin: DOM.iCoin.val(), amount: DOM.iAmount.val()}, function (ret) {
        DATA.buy = false;
        _this.prop('disabled', false).removeClass('color-gray').addClass('color-black');

        if (ret.code == -1) {
          console.log(ret.msg);
          return alert('[에러] 구매 에러가 발생했습니다.\n' + ret.msg);
        }

        alert('정상 구매 성공하였습니다.');
      }, 'json').fail(function (err) {
        DATA.buy = false;
        console.log(err);
        alert('[에러] 구매 에러가 발생했습니다.\npost fail.');
      });
    });
  });
})();
