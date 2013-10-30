/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/notifications',
    'jabbr/core/state',
    'jabbr/core/events',
    'jabbr/core/components/toast'
], function (
    $, Logger, kernel, Notifications, state, events, toast
) {
    var client = null,
        ui = null,
        ru = null,
        rc = null,
        $unreadNotificationCount = $('#notification-unread-count'),
        $downloadIcon = $('#room-preferences .download'),
        $richness = $('#room-preferences .richness'),
        $toast = $('#room-preferences .toast'),
        $sound = $('#room-preferences .sound'),
        $notify = $('#room-actions .notify');

    return Notifications.extend({
        constructor: function () {
            this.base();
        },

        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            
            // Bind events
            client.bind(events.client.loggedOn, $.proxy(function () {
                this.setUnreadNotifications(client.chat.state.unreadNotifications);
            }, this));

            client.chat.client.updateUnreadNotifications = this.setUnreadNotifications;

            if (toast.canToast()) {
                $toast.show();
            } else {
                $richness.css({ left: '55px' });
                $downloadIcon.css({ left: '90px' });
                // We need to set the toast setting to false
                state.get().preferences.canToast = false;
                $toast.hide();
            }

            // Make sure we can toast at all
            toast.ensureToast(state.get().preferences);

            this.attach();
        },
        
        attach: function () {
            $sound.click(function () {
                var room = ru.getCurrentRoomElements();

                if (room.isLobby()) {
                    return;
                }

                $(this).toggleClass('off');

                var enabled = !$(this).hasClass('off');

                // Store the preference
                state.setRoomPreference(room.getName(), 'hasSound', enabled);
            });

            $notify.click(function (e) {
                e.preventDefault();

                var room = ru.getCurrentRoomElements();

                if (room.isLobby()) {
                    return;
                }

                if ($(this).hasClass("notify-all")) {
                    $(this).removeClass('notify-all');
                    $(this).addClass('notify-mentions');
                    $(".notify-text", this).text('Mentions');
                } else if ($(this).hasClass("notify-mentions")) {
                    $(this).removeClass('notify-mentions');
                    $(this).addClass('notify-all');
                    $(".notify-text", this).text('All');
                }

                if ($(this).hasClass("notify-all")) {
                    state.setRoomPreference(room.getName(), 'notify', 'all');
                } else if ($(this).hasClass("notify-mentions")) {
                    state.setRoomPreference(room.getName(), 'notify', 'mentions');
                }
            });

            $toast.click(function () {
                var $this = $(this),
                    enabled = !$this.hasClass('off'),
                    room = ru.getCurrentRoomElements();

                if (room.isLobby()) {
                    return;
                }

                if (enabled) {
                    // If it's enabled toggle the preference
                    state.setRoomPreference(room.getName(), 'canToast', false);
                    $this.toggleClass('off');
                } else {
                    toast.enableToast()
                        .done(function () {
                            state.setRoomPreference(room.getName(), 'canToast', true);
                            $this.removeClass('off');
                        })
                        .fail(function () {
                            state.setRoomPreference(room.getName(), 'canToast', false);
                            $this.addClass('off');
                        });
                }
            });

            $(toast).bind('toast.focus', function (ev, room) {
                window.focus();

                // focus on the room
                rc.activateOrOpenRoom(room);
            });
        },
        
        messageNotification: function (message, room) {
            var roomName = room.getName(),
                isMention = message.highlight,
                notifyType = state.getRoomPreference(roomName, 'notify') || 'mentions',
                currentRoomName = ru.getCurrentRoomElements().getName(),
                roomFocus = roomName === currentRoomName && ui.isFocused();

            if (room.isInitialized()) {
                var hasSound = state.getRoomPreference(roomName, 'hasSound'),
                    canToast = state.getRoomPreference(roomName, 'canToast');

                if (isMention) {
                    // Mention Sound
                    if (roomFocus === false && hasSound === true) {
                        this.notifyMention(true);
                    }
                    // Mention Popup
                    if (roomFocus === false && canToast === true) {
                        this.toastMention(message, true, roomName);
                    }
                } else if (notifyType === 'all') {
                    // All Sound
                    if (roomFocus === false && hasSound === true) {
                        this.notifyRoom(roomName);
                    }
                    // All Popup
                    if (roomFocus === false && canToast === true) {
                        this.toastRoom(roomName, message);
                    }
                }
            }
        },
        
        // TODO - Change name
        notifyRoom: function (roomName) {
            if (state.getRoomPreference(roomName, 'hasSound') === true) {
                $('#notificationSound')[0].play();
            }
        },

        toastRoom: function (roomName, message) {
            if (state.getRoomPreference(roomName, 'canToast') === true) {
                toast.toastMessage(message, roomName);
            }
        },

        // TODO - Change name
        notifyMention: function (force) {
            if (ru.getActiveRoomPreference('hasSound') === true || force) {
                $('#notificationSound')[0].play();
            }
        },

        toastMention: function (message, force, roomName) {
            if (ru.getActiveRoomPreference('canToast') === true || force) {
                toast.toastMessage(message, roomName);
            }
        },
        
        setUnreadNotifications: function (unreadCount) {
            if (unreadCount > 0) {
                $unreadNotificationCount.text(unreadCount);
                $unreadNotificationCount.show();
            } else {
                $unreadNotificationCount.text('');
                $unreadNotificationCount.hide();
            }
        }
    });
});
