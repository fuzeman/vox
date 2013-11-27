/*global define, window, document*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.client',
    'jabbr/core/events',
    'jabbr/core/utility',
    'jabbr/core/viewmodels/message'
], function ($, Logger, kernel, RoomsClient, events, utility, Message) {
    var logger = new Logger('jabbr/components/rooms.client'),
        client = null,
        ui = null,
        ru = null,
        users = null,
        messages = null;

    return RoomsClient.extend({        
        constructor: function () {
            this.base();
        },
        
        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            users = kernel.get('jabbr/components/users');
            messages = kernel.get('jabbr/components/messages');
        },
        
        // #region Chat handlers
        
        roomClosed: function (roomName) {
            messages.addMessage('Room \'' + roomName + '\' is now closed', 'notification', state.get().activeRoom);

            var room = this.getRoom(roomName);

            if (room !== null) {
                room.setClosed(true);

                if (state.get().activeRoom === roomName) {
                    ui.toggleMessageSection(true);
                }
            }
        },
        
        roomUnClosed: function (roomName) {
            messages.addMessage('Room \'' + roomName + '\' is now open', 'notification', state.get().activeRoom);

            var room = this.getRoom(roomName);

            if (room !== null) {
                room.setClosed(false);

                if (state.get().activeRoom === roomName) {
                    ui.toggleMessageSection(false);
                }
            }
        },
        
        lockRoom: function (userdata, roomName, userHasAccess) {
            if (!this.isSelf(userdata) && state.get().activeRoom === roomName) {
                messages.addMessage(userdata.Name + ' has locked ' + roomName + '.',
                    'notification', state.get().activeRoom);
            }

            var room = this.getRoom(roomName);

            if (room !== null) {
                if (userHasAccess) {
                    room.setLocked(true);
                    lobby.lockRoom(roomName);
                } else {
                    lobby.removeRoom(roomName);
                }
            }
        },


        listUsers: function (userlist) {
            if (userlist.length === 0) {
                messages.addMessage('No users matched your search', 'list-header');
            } else {
                messages.addMessage('The following users match your search', 'list-header');
                messages.addMessage(userlist.join(', '), 'list-item');
            }
        },
        
        listAllowedUsers: function (roomName, isPrivate, allowedUsers) {
            if (!isPrivate) {
                messages.addMessage('Anyone is allowed in ' + roomName + ' as it is not private', 'list-header');
            } else if (allowedUsers.length === 0) {
                messages.addMessage('No users are allowed in ' + roomName, 'list-header');
            } else {
                messages.addMessage('The following users are allowed in ' + roomName, 'list-header');
                messages.addMessage(allowedUsers.join(', '), 'list-item');
            }
        },
        
        showUsersOwnedRoomList: function (username, ownedRooms) {
            if (ownedRooms.length === 0) {
                messages.addMessage(username + ' does not own any rooms', 'list-header');
            } else {
                messages.addMessage(username + ' owns the following rooms', 'list-header');
                messages.addMessage(ownedRooms.join(', '), 'list-item');
            }
        },
        
        showUsersRoomList: function (user, rooms) {
            var message;

            if (rooms.length === 0) {
                message = utility.getLanguageResource('Chat_UserNotInRooms', user.Name, user.Status);
                messages.addMessage(message, 'list-header');
            } else {
                message = utility.getLanguageResource('Chat_UserInRooms', user.Name, user.Status);
                messages.addMessage(message, 'list-header');
                messages.addMessage(rooms.join(', '), 'list-item');
            }
        },
        
        showUsersInRoom: function (roomName, usernames) {
            messages.addMessage('Users in ' + roomName, 'list-header');
            if (usernames.length === 0) {
                messages.addMessage('Room is empty', 'list-item');
            } else {
                $.each(usernames, function () {
                    messages.addMessage('- ' + this, 'list-item');
                });
            }
        },

        showUserInfo: function (user) {
            var lastActivityDate = user.LastActivity.fromJsonDate();
            var status = "Currently " + user.Status;
            if (user.IsAfk) {
                status += user.Status === 'Active' ? ' but ' : ' and ';
                status += ' is Afk';
            }
            messages.addMessage('User information for ' + user.Name +
                " (" + status + " - last seen " + $.timeago(lastActivityDate) + ")", 'list-header');

            if (user.AfkNote) {
                messages.addMessage('Afk: ' + user.AfkNote, 'list-item');
            } else if (user.Note) {
                messages.addMessage('Note: ' + user.Note, 'list-item');
            }

            $.getJSON('https://secure.gravatar.com/' + user.Hash + '.json?callback=?', function (profile) {
                ru.showGravatarProfile(profile.entry[0]);
            });

            this.showUsersOwnedRoomList(user.Name, user.OwnedRooms);
        },


        leave: function (userdata, roomName) {
            if (this.isSelf(userdata)) {
                this.setActiveRoom('Lobby');
                this.removeRoom(roomName);
            } else {
                users.remove(userdata, roomName);
                messages.addMessage(userdata.Name + ' left ' + roomName, 'notification', roomName);
            }
        },

        // #endregion
        
        activeRoomChanged: function (room) {
            this.base(room);

            // Clear last message selection.
            ui.resetSelection();
        },
        
        populateRoomFromInfo: function (roomInfo) {
            var room = roomInfo.Name;

            $.each(roomInfo.Users, function () {
                users.createRoomUser(this, room);
            });

            $.each(roomInfo.Owners, function () {
                var user = users.get(this);

                if (user !== undefined && room in user.roomUsers) {
                    user.roomUsers[room].setOwner(true);
                } else {
                    logger.warn('unable to find user "' + this + '"');
                }
            });

            logger.info('loading recent messages');
            $.each(roomInfo.RecentMessages, $.proxy(function (i, message) {
                message.isHistory = true;
                this.trigger(events.rooms.client.createMessage, [message, room]);
            }, this));
            logger.info('finished loading recent messages');

            ru.updateRoomTopic(roomInfo.Name, roomInfo.Topic);

            // mark room as initialized to differentiate messages
            // that are added after initial population
            this.setInitialized(room);
            ru.scrollToBottom(room);
            this.setRoomListStatuses(room);

            // Watch the messages after the defer, since room messages
            // may be appended if we are just joining the room
            messages.watchMessageScroll(this.messageIds, room);
        },
        
        removeRoom: function (roomName) {
            var room = this.getRoom(roomName),
                scrollHandler = null;

            if (room !== null) {
                // Remove the scroll handler from this room
                scrollHandler = room.messages.data('scrollHandler');
                room.messages.unbind('scrollHandler', scrollHandler);

                room.tab.remove();
                room.messages.remove();
                room.users.remove();
                room.roomTopic.remove();
                ru.setAccessKeys();
            }

            if (this.hasRoom(roomName)) {
                logger.trace('Deleting room "' + roomName + '"');

                users.removeRoomUsers(roomName);

                delete this.rooms[this.cleanRoomName(roomName)];
            }
        },
        
        scrollRoomTop: function (roomInfo) {
            // Do nothing if we're loading history already
            if (this.loadingHistory === true) {
                return;
            }

            this.loadingHistory = true;

            try {
                // Show a little animation so the user experience looks fancy
                ru.setLoadingHistory(true);
                this.setRoomTrimmable(roomInfo.name, false);

                logger.trace('getPreviousMessages(' + roomInfo.name + ')');

                client.chat.server.getPreviousMessages(roomInfo.messageId)
                    .done($.proxy(function (previousMessages) {
                        logger.trace('getPreviousMessages.done(' + roomInfo.name + ')');

                        // Insert message history into the room
                        messages.prependChatMessages($.map(previousMessages, function (data) {
                            return new Message(data);
                        }), roomInfo.name);

                        this.loadingHistory = false;
                        ru.setLoadingHistory(false);
                    }, this))
                    .fail($.proxy(function (e) {
                        logger.trace('getPreviousMessages.failed(' + roomInfo.name + ', ' + e + ')');

                        this.loadingHistory = false;
                        ru.setLoadingHistory(false);
                    }, this));
            } catch (e) {
                logger.trace('getPreviousMessages failed: ' + e);
                ru.setLoadingHistory(false);
            }
        },
    });
});