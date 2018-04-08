(function(){
  "use strict";

  $(document).ready(function(){
    var DATA = {
      buy: false
    }

    var DOM = {
      btnBuy: $('#btn_buy')
    }

    DOM.btnBuy.click(function(){
      if (DATA.buy) {
        return alert('구매 진행 중입니다.');
      }

      var _this = $(this);

      DATA.buy = true;
      _this.prop('disabled', true).removeClass('color-black').addClass('color-gray');

      $.post('/buy', function (ret) {
        DATA.buy = false;
        _this.prop('disabled', false).removeClass('color-gray').addClass('color-black');

        if (!ret) {
          console.log(ret.msg);
          return alert('[에러] 구매 에러가 발생했습니다.');
        }

        if (ret.code == -1) {
          console.log(ret.msg);
          return alert('[에러] 구매 에러가 발생했습니다. -1');
        }

        alert('정상 구매 성공하였습니다.');
      }, 'json').fail(function (err) {
        console.log(err);
        alert('[에러] 구매 에러가 발생했습니다.');
      });
    });
  });
})();
