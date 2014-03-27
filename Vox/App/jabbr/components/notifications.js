/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/events',
    'jabbr/components/toast',
    'jabbr/components/lobby',
    'jabbr/utility'
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
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YouGrantedRoomAccess', room));
            };

            client.chat.client.userAllowed = function (user, room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserGrantedRoomAccess', user, room));
            };

            client.chat.client.unallowUser = function (user, room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YourRoomAccessRevoked', room));

                lobby.removeRoom(room);
            };

            client.chat.client.userUnallowed = function (user, room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YouRevokedUserRoomAccess', user, room));
            };

            // Called when you make someone an owner
            client.chat.client.ownerMade = function (user, room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserGrantedRoomOwnership', user, room));
            };

            client.chat.client.ownerRemoved = function (user, room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserRoomOwnershipRevoked', user, room));
            };

            // Called when you've been made an owner
            client.chat.client.makeOwner = function (room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YouGrantedRoomOwnership', room));
            };

            // Called when you've been removed as an owner
            client.chat.client.demoteOwner = function (room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YourRoomOwnershipRevoked', room));
            };

            // Called when your gravatar has been changed
            client.chat.client.gravatarChanged = function () {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YourGravatarChanged'));
            };

            // Called when the server sends a notification message
            client.chat.client.postNotification = function (msg, room) {
                messages.addNotification(msg, room);
            };

            client.chat.client.welcomeChanged = function (isCleared, welcome) {
                var message;

                if (!isCleared) {
                    message = utility.getLanguageResource('Chat_YouSetRoomWelcome', welcome);
                } else {
                    message = utility.getLanguageResource('Chat_YouClearedRoomWelcome');
                }

                messages.addNotificationToActiveRoom(message);

                if (welcome) {
                    messages.addWelcomeToActiveRoom(welcome);
                }
            };

            // Called when you have added or cleared a flag
            client.chat.client.flagChanged = function (isCleared, country) {
                var message;

                if (!isCleared) {
                    message = utility.getLanguageResource('Chat_YouSetFlag', country);
                } else {
                    message = utility.getLanguageResource('Chat_YouClearedFlag');
                }

                messages.addNotificationToActiveRoom(message);
            };

            client.chat.client.sendInvite = function (from, to, room) {
                if (rc.isSelf({ Name: to })) {
                    notifyMention(true);
                    messages.addPrivateMessage(utility.getLanguageResource('Chat_UserInvitedYouToRoom', from, room));
                }
                else {
                    messages.addPrivateMessage(utility.getLanguageResource('Chat_YouInvitedUserToRoom', to, room));
                }
            };

            // Called when you make someone an admin
            client.chat.client.adminMade = function (user) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserAdminAllowed', user));
            };

            client.chat.client.adminRemoved = function (user) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserAdminRevoked', user));
            };

            // Called when you've been made an admin
            client.chat.client.makeAdmin = function () {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YouAdminAllowed'));
            };

            // Called when you've been removed as an admin
            client.chat.client.demoteAdmin = function () {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YouAdminRevoked'));
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
                messages.addBroadcast(utility.getLanguageResource('Chat_AdminBroadcast', message), room);
            };

            // Called when this user locked a room
            client.chat.client.roomLocked = function (room) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_RoomNowLocked', room));
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

                messages.addNotification(message, roomName);

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
                $(this).removeClass('notify-all')
                       .addClass('notify-mentions');
                
                $(".notify-text", this).text('Mentions');
                $("i", this).attr('class', 'icon-bell');
            } else if ($(this).hasClass("notify-mentions")) {
                $(this).removeClass('notify-mentions')
                       .addClass('notify-all');
                
                $(".notify-text", this).text('All');
                $("i", this).attr('class', 'icon-bullhorn');
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