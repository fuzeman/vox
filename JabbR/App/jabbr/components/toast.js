/*global define, window, setTimeout*/
define(['jquery', 'jabbr/utility'], function ($, utility) {
    var ToastStatus = { Allowed: 0, NotConfigured: 1, Blocked: 2 },
        toastTimeOut = 10000,
        toastRoom = null,
        wkNotifications = window.webkitNotifications,
        wkToast = null,
        w3Notifications = typeof Notification !== 'undefined' ? Notification : null,
        w3Toast = null;
    
    function createTitle (message, roomName) {
        var title = utility.trim(message.name, 21);
        
        // we can reliably show 22 chars
        if (title.length <= 19) {
            title += ' (' + utility.trim(roomName, 19 - title.length) + ')';
        }

        return title;
    }

    if (wkNotifications) {
        return {
            canToast: function () {
                // we can toast if webkitNotifications exist and the user hasn't explicitly denied
                return (wkNotifications && wkNotifications.checkPermission() !== ToastStatus.Blocked);
            },

            ensureToast: function (preferences) {
                if ((wkNotifications && wkNotifications.checkPermission() === ToastStatus.NotConfigured)) {
                    preferences.canToast = false;
                }
            },

            toastMessage: function (message, roomName) {
                if (!wkNotifications ||
                    wkNotifications.checkPermission() !== ToastStatus.Allowed) {
                    return;
                }

                var toastTitle = createTitle(message, roomName);
                toastRoom = roomName;

                // Hide any previously displayed toast
                this.hideToast();

                wkToast = wkNotifications.createNotification(
                    'Content/images/logo32.png',
                    toastTitle,
                    $('<div/>').html(message.message).text());

                wkToast.ondisplay = function () {
                    setTimeout(function () {
                        wkToast.cancel();
                    }, toastTimeOut);
                };

                wkToast.onclick = function () {
                    this.hideToast();

                    // Trigger the focus events - focus the window and open the source room
                    $(this).trigger('toast.focus', [toastRoom]);
                };

                wkToast.show();
            },

            hideToast: function() {
                if (wkToast && wkToast.cancel) {
                    wkToast.cancel();
                }
            },

            enableToast: function (callback) {
                var deferred = $.Deferred();

                if (wkNotifications) {
                    // If not configured, request permission
                    if (wkNotifications.checkPermission() === ToastStatus.NotConfigured) {
                        wkNotifications.requestPermission(function () {
                            if (wkNotifications.checkPermission()) {
                                deferred.reject();
                            } else {
                                deferred.resolve();
                            }
                        });
                    } else if (wkNotifications.checkPermission() === ToastStatus.Allowed) {
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
    } else if (w3Notifications) {
        return {
            canToast: function () {
                // we can toast if webkitNotifications exist and the user hasn't explicitly denied
                return w3Notifications;
            },

            ensureToast: function (preferences) {
                if (w3Notifications && w3Notifications.permission === 'default') {
                    preferences.canToast = false;
                }
            },

            toastMessage: function (message, roomName) {
                if (!w3Notifications || w3Notifications.permission != 'granted') {
                    return;
                }

                var toastTitle = createTitle(message, roomName);
                toastRoom = roomName;

                // Hide any previously displayed toast
                this.hideToast();

               w3Toast = new Notification(toastTitle, {
                    dir: "auto",
                    lang: "",
                    body: $('<div/>').html(message.message).text(),
                    tag: "jabbr",
                    onshow: function () {
                        setTimeout(function () {
                            w3Toast.close();
                        }, toastTimeOut);
                    },
                    onclick: function () {
                        this.hideToast();

                        // Trigger the focus events - focus the window and open the source room
                        $(this).trigger('toast.focus', [toastRoom]);
                    }
                });
            },

            hideToast: function () {
                if (w3Toast && w3Toast.close) {
                    w3Toast.close();
                }
            },

            enableToast: function (callback) {
                var deferred = $.Deferred();

                if (w3Notifications) {
                    // If not configured, request permission
                    if (w3Notifications.permission == 'default') {
                        w3Notifications.requestPermission(function () {
                            if (w3Notifications.permission == 'granted') {
                                deferred.resolve();
                            } else {
                                deferred.reject();
                            }
                        });
                    } else if (w3Notifications.permission == 'granted') {
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
    } else {
        return {
            canToast: function () { return false; },
            
            ensureToast: function (preferences) {
                preferences.canToast = false;
            }
        };
    }
});
