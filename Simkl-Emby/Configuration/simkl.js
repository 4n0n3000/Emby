define([
    "loading",
    "baseView",
    "emby-input",
    "emby-button",
    "emby-select",
    "emby-checkbox"

], function (loading, BaseView) {

    "use strict";

    function fetchExistingConfiguration(userId) {

        return ApiClient.getTypedUserSettings(userId, 'simkl');
    }

    function loadConfiguration(userId, form) {

        fetchExistingConfiguration(userId).then(function (currentUserConfig) {

            // TODO: fill user with data from currentUserConfig

            loading.hide();
        });
    }

    function onSubmit(ev) {
        ev.preventDefault();
        loading.show();

        var instance = this;

        var form = ev.currentTarget;

        var currentUserId = instance.params.userId;

        fetchExistingConfiguration(currentUserId).then(function (currentUserConfig) {

            // TODO: update currentUserConfig with data from UI


            ApiClient.updateTypedUserSettings(currentUserId, 'simkl', currentUserConfig).then(
                function (result) {
                    Dashboard.processPluginConfigurationUpdateResult(result);
                    loadConfiguration(currentUserId, form);
                }
            );
        });

        return false;
    }

    function View(view, params) {

        BaseView.apply(this, arguments);

        var form = view.querySelector("form");
        form.addEventListener("submit", onSubmit.bind(this));
    }

    Object.assign(View.prototype, BaseView.prototype);

    View.prototype.onResume = function (options) {

        BaseView.prototype.onResume.apply(this, arguments);

        if (options.refresh) {
            loading.show();

            var view = this.view;
            var form = view.querySelector("form");
            var instance = this;

            loadConfiguration(instance.params.userId, form);
        }
    };

    return View;
});
