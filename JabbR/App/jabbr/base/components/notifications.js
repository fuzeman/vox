/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/utility',
    'jabbr/core/state'
], function ($, Logger, kernel, EventObject, utility, state) {
    var logger = new Logger('jabbr/components/notifications'),
        client = null,
        ru = null,
        rc = null,
        messages = null,
        lobby = null;

    return EventObject.extend({        
        constructor: function () {
            this.base();

            kernel.bind('jabbr/components/notifications', this);
        },

        activate: function () {
            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            messages = kernel.get('jabbr/components/messages');
            lobby = kernel.get('jabbr/components/lobby');

            logger.trace('activated');

            this.bindNotificationEvents();
        },
        
        messageNotification: function (message, room) { logger.warn('messageNotification not implemented'); },
        
        bindNotificationEvents: function () {
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

            client.chat.client.sendInvite = $.proxy(function (from, to, room) {
                if (rc.isSelf({ Name: to })) {
                    this.notifyMention(true);
                    messages.addPrivateMessage('*' + from + '* has invited you to #' + room +
                        '. Click the room name to join.', 'pm');
                }
                else {
                    messages.addPrivateMessage('Invitation to *' + to + '* to join #' + room + ' has been sent.', 'pm');
                }
            }, this);

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
    });
});