define([
    "baseView"

], function (BaseView) {

    "use strict";

    function View(view, params) {

        BaseView.apply(this, arguments);
    }

    Object.assign(View.prototype, BaseView.prototype);

    return View;
});
