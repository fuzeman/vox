/*global define, window, setTimeout*/
define(['jquery', 'jabbr/utility'], function ($, utility) {
    var ToastStatus = { Allowed: 0, NotConfigured: 1, Blocked: 2 },
        toastTimeOut = 10000,
        chromeToast = null,
        toastRoom = null;

    function hideToast() {
        if (chromeToast && chromeToast.cancel) {
            chromeToast.cancel();
        }
    }

    var toast = {
        canToast: function () {
            // we can toast if webkitNotifications exist and the user hasn't explicitly denied
            return window.webkitNotifications && window.webkitNotifications.checkPermission() !== ToastStatus.Blocked;
        },
        ensureToast: function (preferences) {
            if (window.webkitNotifications &&
                window.webkitNotifications.checkPermission() === ToastStatus.NotConfigured) {
                preferences.canToast = false;
            }
        },
        toastMessage: function (message, roomName) {
            if (!window.webkitNotifications ||
                window.webkitNotifications.checkPermission() !== ToastStatus.Allowed) {
                return;
            }

            var toastTitle = utility.trim(message.name, 21);
            // we can reliably show 22 chars
            if (toastTitle.length <= 19) {
                toastTitle += ' (' + utility.trim(roomName, 19 - toastTitle.length) + ')';
            }

            toastRoom = roomName;

            // Hide any previously displayed toast
            hideToast();

            chromeToast = window.webkitNotifications.createNotification(
                'Content/images/logo32.png',
                toastTitle,
                $('<div/>').html(message.message).text());

            chromeToast.ondisplay = function () {
                setTimeout(function () {
                    chromeToast.cancel();
                }, toastTimeOut);
            };

            chromeToast.onclick = function () {
                hideToast();

                // Trigger the focus events - focus the window and open the source room
                $(toast).trigger('toast.focus', [toastRoom]);
            };

            chromeToast.show();
        },
        hideToast: hideToast,
        enableToast: function (callback) {
            var deferred = $.Deferred();
            if (window.webkitNotifications) {
                // If not configured, request permission
                if (window.webkitNotifications.checkPermission() === ToastStatus.NotConfigured) {
                    window.webkitNotifications.requestPermission(function () {
                        if (window.webkitNotifications.checkPermission()) {
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                    });
                } else if (window.webkitNotifications.checkPermission() === ToastStatus.Allowed) {
                    // If we're allowed then just resolve here
                    deferred.resolve();
                } else {
                    // We don't have permission
                    deferred.reject();
                }
            }

            return deferred;
        }
    };

    return toast;
});