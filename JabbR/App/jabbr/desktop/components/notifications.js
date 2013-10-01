/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/core/state',
    'jabbr/core/events',
    'jabbr/core/components/toast',
    'jabbr/desktop/components/lobby',
    'jabbr/core/utility'
], function ($, Logger, kernel, state, events, toast, lobby, utility) {
    var logger = new Logger('jabbr/components/notifications'),
        client = null,
        ui = null,
        rc = null,
        ru = null,
        messages = null,
        object = null;

    var initialize = function () {
        var $unreadNotificationCount = $('#notification-unread-count'),
            $notify = $('#room-actions .notify'),
            $toast = $('#room-preferences .toast'),
            $sound = $('#room-preferences .sound'),
            $downloadIcon = $('#room-preferences .download'),
            $richness = $('#room-preferences .richness');

        function setUnreadNotifications(unreadCount) {
            if (unreadCount > 0) {
                $unreadNotificationCount.text(unreadCount);
                $unreadNotificationCount.show();
            } else {
                $unreadNotificationCount.text('');
                $unreadNotificationCount.hide();
            }
        }

        function clientLoggedOn() {
            setUnreadNotifications(client.chat.state.unreadNotifications);
        }

        // TODO - Change name
        function notifyRoom(roomName) {
            if (state.getRoomPreference(roomName, 'hasSound') === true) {
                $('#notificationSound')[0].play();
            }
        }

        function toastRoom(roomName, message) {
            if (state.getRoomPreference(roomName, 'canToast') === true) {
                toast.toastMessage(message, roomName);
            }
        }

        // TODO - Change name
        function notifyMention(force) {
            if (ru.getActiveRoomPreference('hasSound') === true || force) {
                $('#notificationSound')[0].play();
            }
        }

        function toastMention(message, force, roomName) {
            if (ru.getActiveRoomPreference('canToast') === true || force) {
                toast.toastMessage(message, roomName);
            }
        }

        function bindNotificationEvents() {
            client.chat.client.allowUser = function (room) {
                messages.addMessage('You were granted access to ' + room, 'notification', state.get().activeRoom);
            };

            client.chat.client.userAllowed = function (user, room) {
                messages.addMessage(user + ' now has access to ' + room, 'notification', state.get().activeRoom);
            };

            client.chat.client.unallowUser = function (user, room) {
                messages.addMessage('Your access to ' + room + ' was revoked.', 'notification', state.get().activeRoom);

                lobby.removeRoom(room);
            };

            client.chat.client.userUnallowed = function (user, room) {
                messages.addMessage('You have revoked ' + user + '\'s access to ' + room, 'notification',
                    state.get().activeRoom);
            };

            // Called when you make someone an owner
            client.chat.client.ownerMade = function (user, room) {
                messages.addMessage(user + ' is now an owner of ' + room, 'notification', state.get().activeRoom);
            };

            client.chat.client.ownerRemoved = function (user, room) {
                messages.addMessage(user + ' is no longer an owner of ' + room, 'notification', state.get().activeRoom);
            };

            // Called when you've been made an owner
            client.chat.client.makeOwner = function (room) {
                messages.addMessage('You are now an owner of ' + room, 'notification', state.get().activeRoom);
            };

            // Called when you've been removed as an owner
            client.chat.client.demoteOwner = function (room) {
                messages.addMessage('You are no longer an owner of ' + room, 'notification', state.get().activeRoom);
            };

            // Called when your gravatar has been changed
            client.chat.client.gravatarChanged = function () {
                messages.addMessage('Your gravatar has been set', 'notification', state.get().activeRoom);
            };

            // Called when the server sends a notification message
            client.chat.client.postNotification = function (msg, room) {
                messages.addMessage(msg, 'notification', room);
            };

            client.chat.client.setPassword = function () {
                messages.addMessage('Your password has been set', 'notification', state.get().activeRoom);
            };

            client.chat.client.changePassword = function () {
                messages.addMessage('Your password has been changed', 'notification', state.get().activeRoom);
            };

            // Called when you have added or cleared a note
            client.chat.client.noteChanged = function (isAfk, isCleared) {
                var afkMessage = 'You have gone AFK';
                var noteMessage = 'Your note has been ' + (isCleared ? 'cleared' : 'set');
                messages.addMessage(isAfk ? afkMessage : noteMessage, 'notification', state.get().activeRoom);
            };

            client.chat.client.welcomeChanged = function (isCleared, welcome) {
                var action = isCleared ? 'cleared' : 'set';
                var to = welcome ? ' to:' : '';
                var message = 'You have ' + action + ' the room welcome' + to;
                messages.addMessage(message, 'notification', state.get().activeRoom);
                if (welcome) {
                    messages.addMessage(welcome, 'welcome', state.get().activeRoom);
                }
            };

            // Called when you have added or cleared a flag
            client.chat.client.flagChanged = function (isCleared, country) {
                var action = isCleared ? 'cleared' : 'set';
                var place = country ? ' to ' + country : '';
                var message = 'You have ' + action + ' your flag' + place;
                messages.addMessage(message, 'notification', state.get().activeRoom);
            };

            client.chat.client.sendInvite = function (from, to, room) {
                if (rc.isSelf({ Name: to })) {
                    notifyMention(true);
                    messages.addPrivateMessage('*' + from + '* has invited you to #' + room +
                        '. Click the room name to join.', 'pm');
                }
                else {
                    messages.addPrivateMessage('Invitation to *' + to + '* to join #' + room + ' has been sent.', 'pm');
                }
            };

            // Called when you make someone an admin
            client.chat.client.adminMade = function (user) {
                messages.addMessage(user + ' is now an admin', 'notification', state.get().activeRoom);
            };

            client.chat.client.adminRemoved = function (user) {
                messages.addMessage(user + ' is no longer an admin', 'notification', state.get().activeRoom);
            };

            // Called when you've been made an admin
            client.chat.client.makeAdmin = function () {
                messages.addMessage('You are now an admin', 'notification', state.get().activeRoom);
            };

            // Called when you've been removed as an admin
            client.chat.client.demoteAdmin = function () {
                messages.addMessage('You are no longer an admin', 'notification', state.get().activeRoom);
            };

            client.chat.client.userMuted = function (user, room) {
                if (rc.isSelf({ Name: user })) {
                    messages.addMessage('You have been muted', 'notification', room);
                } else {
                    messages.addMessage(user + ' has been muted', 'notification', room);
                }
            };

            client.chat.client.userUnMuted = function (user, room) {
                if (rc.isSelf({ Name: user })) {
                    messages.addMessage('You have been un-muted', 'notification', room);
                } else {
                    messages.addMessage(user + ' has been un-muted', 'notification', room);
                }
            };

            client.chat.client.broadcastMessage = function (message, room) {
                messages.addMessage('ADMIN: ' + message, 'broadcast', room);
            };

            // Called when this user locked a room
            client.chat.client.roomLocked = function (room) {
                messages.addMessage(room + ' is now locked.', 'notification', state.get().activeRoom);
            };

            client.chat.client.topicChanged = function (roomName, topic, who) {
                var message,
                    isCleared = (topic === '');

                if (who === client.chat.state.name) {
                    if (!isCleared) {
                        message = utility.getLanguageResource('Chat_YouSetRoomTopic', topic);
                    } else {
                        message = utility.getLanguageResource('Chat_YouClearedRoomTopic');
                    }
                } else {
                    if (!isCleared) {
                        message = utility.getLanguageResource('Chat_UserSetRoomTopic', who, topic);
                    } else {
                        message = utility.getLanguageResource('Chat_UserClearedRoomTopic', who);
                    }
                }

                messages.addMessage(message, 'notification', roomName);

                ru.updateRoomTopic(roomName, topic);
            };
        }

        // #region DOM Events

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

        // #endregion

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

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');
                rc = kernel.get('jabbr/components/rooms.client');
                ru = kernel.get('jabbr/components/rooms.ui');
                messages = kernel.get('jabbr/components/messages');

                logger.trace('activated');

                // Bind events
                client.bind(events.client.loggedOn, clientLoggedOn);

                client.chat.client.updateUnreadNotifications = setUnreadNotifications;

                bindNotificationEvents();
            },

            notifyRoom: notifyRoom,
            toastRoom: toastRoom,

            notifyMention: notifyMention,
            toastMention: toastMention,

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
                            notifyMention(true);
                        }
                        // Mention Popup
                        if (roomFocus === false && canToast === true) {
                            toastMention(message, true, roomName);
                        }
                    } else if (notifyType === 'all') {
                        // All Sound
                        if (roomFocus === false && hasSound === true) {
                            notifyRoom(roomName);
                        }
                        // All Popup
                        if (roomFocus === false && canToast === true) {
                            toastRoom(roomName, message);
                        }
                    }
                }
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/notifications', object);
        }

        return object;
    };
});