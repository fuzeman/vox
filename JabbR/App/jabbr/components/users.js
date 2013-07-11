/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/viewmodels/user',
    'jabbr/viewmodels/room-user'
], function ($, Logger, kernel, state, User, RoomUser) {
    var logger = new Logger('jabbr/components/users'),
        client = null,
        ru = null,
        rc = null,
        messages = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        // Templates
        var templates = {
            user: $('#new-user-template')
        };

        // Elements

        // Variables
        var users = {}; // { <username>: <User> }

        function createUser(userdata) {
            if (userdata.Name in users) {
                logger.trace("User '" + userdata.Name + "' already exists, returning existing one.");
                return users[userdata.Name];
            }

            logger.trace("Creating user '" + userdata.Name + "'");

            users[userdata.Name] = new User(ru, userdata);

            return users[userdata.Name];
        }

        function createRoomUser(userdata, roomName, isOwner) {
            isOwner = typeof isOwner !== 'undefined' ? isOwner : false;

            var user = createUser(userdata);

            if (roomName in user.roomUsers) {
                logger.trace("RoomUser '" + userdata.Name + "' #" + roomName + " already exists, returning existing one.");
                return user.roomUsers[roomName];
            }

            logger.trace("Creating RoomUser '" + userdata.Name + "' #" + roomName);

            var room = ru.getRoomElements(roomName);

            if (room == null) {
                logger.warn('Room "' + roomName + '" does not exist, unable to add room user.')
                return null;
            }

            var roomUser = new RoomUser(ru, user, roomName, room);
            user.roomUsers[roomName] = roomUser;

            // Remove all users that are being removed
            room.users.find('.removing').remove();

            // Get the user element
            var $roomUser = room.getUser(userdata.name);

            if ($roomUser.length) {
                return null;
            }

            $roomUser = templates.user.tmpl(user);
            $roomUser.data('inroom', roomName);
            $roomUser.data('owner', user.owner);
            $roomUser.data('admin', user.admin);
            $roomUser.data('mention', user.mention);

            roomUser.$roomUser = $roomUser;

            room.addUser(roomUser);

            roomUser.updateNote();
            roomUser.updateFlag();
            roomUser.updateActivity();

            if (isOwner) {
                roomUser.setOwner(true);
            }

            return user.roomUsers[roomName];
        }

        function remove(userdata, roomName) {
            if (!(userdata.Name in users) || !(roomName in users[userdata.Name].roomUsers)) {
                logger.warn('unable to find user "' + userdata.Name + '" in #' + roomName + ' to remove');
                return;
            }

            var room = ru.getRoomElements(roomName),
                user = users[userdata.Name],
                roomUser = user.roomUsers[roomName],
                $roomUser = roomUser.$roomUser;

            $roomUser.addClass('removing')
                .fadeOut('slow', function () {
                    var owner = $roomUser.data('owner') || false;
                    $(this).remove();

                    if (owner === true) {
                        room.setListState(room.owners);
                    } else {
                        room.setListState(room.activeUsers);
                    }

                    delete user.roomUsers[roomName];
                });
        }

        function exists(username, roomname) {
            if (username !== undefined && roomname !== undefined) {
                return username in users && roomname in users[username].roomUsers;
            }
            return username in users;
        }

        function removeRoomUsers(roomName) {
            $.each(users, function (username, user) {
                if (roomName in user.roomUsers) {
                    delete user.roomUsers[roomName];
                    logger.trace('removed room user "' + username + '" from #' + roomName);
                }
            });
        }

        //
        // Event Handlers
        //

        // Hub
        // ReSharper disable InconsistentNaming

        function client_updateActivity(userdata) {
            logger.trace('client_updateActivity');

            if (exists(userdata.Name)) {
                users[userdata.Name].setUserActivity(userdata);
            } else {
                logger.warn('user "' + userdata.Name + '" does not exist, unable to update activity.');
            }
        }

        function client_markInactive(inactiveUsers) {
            logger.trace('client_markInactive');

            $.each(inactiveUsers, function () {
                client_updateActivity(this);
            });
        }

        function client_addUser(userdata, room, isOwner) {
            logger.trace('client_addUser');

            var user = createUser(userdata);
            var added = !(room in user.roomUsers);

            createRoomUser(userdata, room, isOwner);

            if (added) {
                if (!ru.isSelf(userdata)) {
                    messages.addMessage(userdata.Name + ' just entered ' + room, 'notification', room);
                }
            }
        }

        function client_setTyping(userdata, roomname) {
            logger.trace('client_setTyping');

            if (!exists(userdata.Name, roomname)) {
                createRoomUser(userdata, roomname);
            }
            users[userdata.Name].roomUsers[roomname].setTyping();
        }

        function client_addAdmin(userdata, roomname) {
            logger.trace('client_addAdmin');

            if (!exists(userdata.Name, roomname)) {
                createRoomUser(userdata, roomname);
            }

            users[userdata.Name].roomUsers[roomname].setAdmin(true);
        }

        function client_removeAdmin(userdata, roomname) {
            logger.trace('client_removeAdmin');

            if (!exists(userdata.Name, roomname)) {
                createRoomUser(userdata, roomname);
            }

            users[userdata.Name].roomUsers[roomname].setAdmin(false);
        }

        function client_addOwner(userdata, roomname) {
            logger.trace('client_addOwner');

            if (!exists(userdata.Name, roomname)) {
                createRoomUser(userdata, roomname);
            }

            users[userdata.Name].roomUsers[roomname].setOwner(true);
        }

        function client_removeOwner(userdata, roomname) {
            logger.trace('client_removeOwner');

            if (!exists(userdata.Name, roomname)) {
                createRoomUser(userdata, roomname);
            }

            users[userdata.Name].roomUsers[roomname].setOwner(false);
        }

        //
        // Hub Callbacks
        //

        var callbacks = {
            bind: function() {
                client.chat.client.changeUserName = this.changeUserName;
                client.chat.client.changeGravatar = this.changeGravatar;
                client.chat.client.changeNote = this.changeNote;
                client.chat.client.changeFlag = this.changeFlag;

                client.chat.client.userNameChanged = this.userNameChanged;
            },

            changeUserName: function(oldName, userdata, roomName) {
                if (!(oldName in users)) {
                    logger.warn('unable to find old username "' + oldName + '" to update');
                    return;
                }

                users[oldName].changeUserName(userdata);
                users[userdata.Name] = users[oldName];
                delete users[oldName];

                if (!ru.isSelf(userdata)) {
                    messages.addMessage(oldName + '\'s nick has changed to ' + userdata.Name,
                        'notification', roomName);
                }

                logger.info('changed username from "' + oldName + '" to "' + userdata.Name + '"');
            },

            changeGravatar: function(userdata, roomName) {
                if (!(userdata.Name in users)) {
                    logger.warn('unable to find username "' + userdata.Name + '" to update');
                    return;
                }

                users[userdata.Name].changeGravatar(userdata);

                if (!ru.isSelf(userdata)) {
                    messages.addMessage(userdata.Name + "'s gravatar changed.",
                        'notification', roomName);
                }
            },

            changeNote: function(userdata, roomName) {
                if (!(userdata.Name in users)) {
                    logger.warn('unable to find username "' + userdata.Name + '" to update');
                    return;
                }

                users[userdata.Name].changeNote(userdata);

                if (!isSelf(user)) {
                    var message;

                    if (userdata.IsAfk === true) {
                        message = userdata.Name + ' has gone AFK';
                    } else {
                        message = userdata.Name + ' has ' + (userdata.Note ? 'set' : 'cleared') + ' their note';
                    }

                    messages.addMessage(message, 'notification', roomName);
                }
            },

            changeFlag: function(userdata, roomName) {
                if (!(userdata.Name in users)) {
                    logger.warn('unable to find username "' + userdata.Name + '" to update');
                    return;
                }

                var user = users[userdata.Name];
                user.changeFlag(userdata);

                if (!ru.isSelf(userdata)) {
                    var action = userdata.Flag ? 'set' : 'cleared',
                        country = user.country ? ' to ' + user.country : '',
                        message = userdata.Name + ' has ' + action + ' their flag' + country;
                    messages.addMessage(message, 'notification', roomName);
                }
            },

            userNameChanged: function(userdata) {
                // Update the client state
                client.chat.state.name = userdata.Name;
                // TODO ui.setUserName(chat.state.name); is this needed?
                messages.addMessage('Your name is now ' + userdata.Name, 'notification', state.get().activeRoom);
            }
        };

        // ReSharper restore InconsistentNaming

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ru = kernel.get('jabbr/components/rooms.ui');
                rc = kernel.get('jabbr/components/rooms.client');
                messages = kernel.get('jabbr/components/messages');

                logger.trace('activated');

                // Bind events
                client.chat.client.updateActivity = client_updateActivity;
                client.chat.client.markInactive = client_markInactive;
                client.chat.client.addUser = client_addUser;
                client.chat.client.setTyping = client_setTyping;

                client.chat.client.addAdmin = client_addAdmin;
                client.chat.client.removeAdmin = client_removeAdmin;

                client.chat.client.addOwner = client_addOwner;
                client.chat.client.removeOwner = client_removeOwner;

                callbacks.bind();
            },

            remove: remove,

            get: function (name) {
                return users[name];
            },

            createUser: createUser,
            createRoomUser: createRoomUser,

            removeRoomUsers: removeRoomUsers
        };
    };

    return function () {
        if (object === null) {
            object = initialize();

            kernel.bind('jabbr/components/users', object);
        }

        return object;
    };
});