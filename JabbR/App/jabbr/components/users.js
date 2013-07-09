/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/viewmodels/user',
    'jabbr/viewmodels/room-user'
], function ($, Logger, kernel, User, RoomUser) {
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
                roomUser.setOwner();
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

        //
        // Event Handlers
        //

        // Hub
        // ReSharper disable InconsistentNaming

        function client_updateActivity(userdata) {
            logger.trace('client_updateActivity');

            if (userdata.Name in users) {
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
            },

            remove: remove,

            get: function (name) {
                return users[name];
            },

            createUser: createUser,
            createRoomUser: createRoomUser
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