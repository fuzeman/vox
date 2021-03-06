﻿/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/utility',
    'jabbr/templates',
    'jabbr/viewmodels/user',
    'jabbr/viewmodels/room-user'
], function ($, Logger, kernel, state, utility, templates, User, RoomUser) {
    var logger = new Logger('jabbr/components/users'),
        client = null,
        ru = null,
        rc = null,
        messages = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
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
                logger.trace("RoomUser '" + userdata.Name + "' #" + roomName +
                    " already exists, returning existing one.");
                return user.roomUsers[roomName];
            }

            logger.trace("Creating RoomUser '" + userdata.Name + "' #" + roomName);

            var room = ru.getRoomElements(roomName);

            if (room === null) {
                logger.warn('Room "' + roomName + '" does not exist, unable to add room user.');
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
        // Hub Handlers
        //

        var handlers = {
            bind: function () {
                client.chat.client.changeUserName = this.chat.changeUserName;
                client.chat.client.changeGravatar = this.chat.changeGravatar;
                client.chat.client.changeMentions = this.chat.changeMentions;
                client.chat.client.changeNote = this.chat.changeNote;
                client.chat.client.changeAfk = this.chat.changeAfk;
                client.chat.client.changeFlag = this.chat.changeFlag;
                client.chat.client.changeExternalStatus = this.chat.changeExternalStatus;

                client.chat.client.userNameChanged = this.chat.userNameChanged;

                client.chat.client.updateActivity = this.chat.updateActivity;
                client.chat.client.markInactive = this.chat.markInactive;

                client.chat.client.addUser = this.chat.addUser;
                client.chat.client.setTyping = this.chat.setTyping;

                client.chat.client.addAdmin = this.chat.addAdmin;
                client.chat.client.removeAdmin = this.chat.removeAdmin;

                client.chat.client.addOwner = this.chat.addOwner;
                client.chat.client.removeOwner = this.chat.removeOwner;

                logger.trace('handlers bound');
            },
            chat: {
                changeUserName: function (oldName, user, room) {
                    if (!(oldName in users)) {
                        logger.warn('unable to find old username "' + oldName + '" to update');
                        return;
                    }

                    users[oldName].changeUserName(user);
                    users[user.Name] = users[oldName];
                    delete users[oldName];

                    if (!rc.isSelf(user)) {
                        messages.addNotification(utility.getLanguageResource('Chat_UserNameChanged', oldName, user.Name), room);
                    }

                    logger.info('changed username from "' + oldName + '" to "' + user.Name + '"');
                },

                changeGravatar: function (user, room) {
                    if (!(user.Name in users)) {
                        logger.warn('unable to find username "' + user.Name + '" to update');
                        return;
                    }

                    users[user.Name].changeGravatar(user);

                    if (!rc.isSelf(user)) {
                        messages.addNotification(utility.getLanguageResource('Chat_UserGravatarChanged', user.Name), room);
                    }
                },

                changeMentions: function (userdata, roomName) {
                    if (!(userdata.Name in users)) {
                        logger.warn('unable to find username "' + userdata.Name + '" to update');
                        return;
                    }

                    users[userdata.Name].changeMentions(userdata);
                },

                changeNote: function (user, room) {
                    if (!(user.Name in users)) {
                        logger.warn('unable to find username "' + user.Name + '" to update');
                        return;
                    }

                    users[user.Name].changeNote(user);
                    
                    var message;

                    if (!rc.isSelf(user)) {
                        if (user.Note) {
                            message = user.Name + " has set their note to \"" + user.Note + "\".";
                        } else {
                            message = user.Name + " has cleared their note.";
                        }
                    } else {
                        if (user.Note) {
                            message = "Your note has been set to \"" + user.Note + "\".";
                        } else {
                            message = "Your note has been cleared.";
                        }
                    }
                    
                    messages.addNotification(message, room);
                },
                
                changeAfk: function (user, room) {
                    if (!(user.Name in users)) {
                        logger.warn('unable to find username "' + user.Name + '" to update');
                        return;
                    }
                    
                    users[user.Name].changeNote(user);

                    var message;

                    if (!rc.isSelf(user)) {
                        if (user.AfkNote) {
                            message = user.Name + " has gone AFK, with the message \"" + user.AfkNote + "\".";
                        } else {
                            message = user.Name + " has gone AFK.";
                        }
                    } else {
                        if (user.AfkNote) {
                            message = "You have gone AFK, with the message \"" + user.AfkNote + "\".";
                        } else {
                            message = "You have gone AFK.";
                        }
                    }

                    messages.addNotification(message, room);
                },

                changeFlag: function (user, room) {
                    if (!(user.Name in users)) {
                        logger.warn('unable to find username "' + user.Name + '" to update');
                        return;
                    }

                    users[user.Name].changeFlag(user);

                    if (!rc.isSelf(user)) {
                        if (user.Flag) {
                            message = utility.getLanguageResource('Chat_UserSetFlag', user.Name, users[user.Name].country);
                        } else {
                            message = utility.getLanguageResource('Chat_UserClearedFlag', user.Name);
                        }

                        messages.addNotification(message, room);
                    }
                },

                changeExternalStatus: function (username, source, type, text, timestamp, interval) {
                    logger.trace('externalStatusChanged ' + username + ' ' + type + ' ' + text);

                    if (!(username in users)) {
                        logger.warn('unable to find username "' + username + '" to update');
                        return;
                    }

                    users[username].changeExternalStatus(source, type, text, timestamp, interval);
                },

                userNameChanged: function (user) {
                    // Update the client state
                    client.chat.state.name = user.Name;
                    // TODO ui.setUserName(chat.state.name); is this needed?
                    messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_YourNameChanged', user.Name));
                },

                updateActivity: function (userdata) {
                    logger.trace('updateActivity');

                    if (exists(userdata.Name)) {
                        users[userdata.Name].setUserActivity(userdata);
                    } else {
                        logger.warn('user "' + userdata.Name + '" does not exist, unable to update activity.');
                    }
                },

                markInactive: function (inactiveUsers) {
                    logger.trace('markInactive');

                    $.each(inactiveUsers, function () {
                        if (exists(this.Name)) {
                            users[this.Name].setUserActivity(this);
                        } else {
                            logger.warn('user "' + this.Name + '" does not exist, unable to mark inactive.');
                        }
                    });
                },

                addUser: function (userdata, room, isOwner) {
                    logger.trace('client_addUser');

                    var user = createUser(userdata);
                    var added = !(room in user.roomUsers);

                    createRoomUser(userdata, room, isOwner);

                    if (added) {
                        if (!rc.isSelf(userdata)) {
                            messages.addNotification(utility.getLanguageResource('Chat_UserEnteredRoom', userdata.Name, room), room);
                        }
                    }
                },

                setTyping: function (userdata, roomname) {
                    logger.trace('client_setTyping');

                    if (!exists(userdata.Name, roomname)) {
                        createRoomUser(userdata, roomname);
                    }
                    users[userdata.Name].roomUsers[roomname].setTyping();
                },

                addAdmin: function (userdata, roomname) {
                    logger.trace('client_addAdmin');

                    if (!exists(userdata.Name, roomname)) {
                        createRoomUser(userdata, roomname);
                    }

                    users[userdata.Name].roomUsers[roomname].setAdmin(true);
                },

                removeAdmin: function (userdata, roomname) {
                    logger.trace('client_removeAdmin');

                    if (!exists(userdata.Name, roomname)) {
                        createRoomUser(userdata, roomname);
                    }

                    users[userdata.Name].roomUsers[roomname].setAdmin(false);
                },

                addOwner: function (userdata, roomname) {
                    logger.trace('client_addOwner');

                    if (!exists(userdata.Name, roomname)) {
                        createRoomUser(userdata, roomname);
                    }

                    users[userdata.Name].roomUsers[roomname].setOwner(true);
                },

                removeOwner: function (userdata, roomname) {
                    logger.trace('client_removeOwner');

                    if (!exists(userdata.Name, roomname)) {
                        createRoomUser(userdata, roomname);
                    }

                    users[userdata.Name].roomUsers[roomname].setOwner(false);
                }
            }
        };

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ru = kernel.get('jabbr/components/rooms.ui');
                rc = kernel.get('jabbr/components/rooms.client');
                messages = kernel.get('jabbr/components/messages');

                logger.trace('activated');

                handlers.bind();
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