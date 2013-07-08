/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/ui',
    'jabbr/state',
    'jabbr/events',
], function ($, Logger, kernel, ui, state, events) {
    var logger = new Logger('jabbr/components/rooms.client'),
        client = null,
        users = null,
        object = null;
    
    logger.trace('loaded');

    var initialize = function() {
        var $this = $(this),
            messageHistory = {},
            pendingMessages = {},
            messageIds = [],
            historyLocation = 0;

        //
        // Private Functions
        //

        function getRoomPreferenceKey(roomName) {
            return '_room_' + roomName;
        }

        function populateRoom(room) {
            var d = $.Deferred();

            client.connection.hub.log('getRoomInfo(' + room + ')');

            // Populate the list of users rooms and messages
            client.chat.server.getRoomInfo(room).done(function(roomInfo) {
                client.connection.hub.log('getRoomInfo.done(' + room + ')');

                $.each(roomInfo.Users, function() {
                    users.createRoomUser(this, room);
                });

                $.each(roomInfo.Owners, function() {
                    var user = users.get(this);

                    if (user !== undefined && room in user.roomUsers) {
                        user.roomUsers[room].setOwner();
                    } else {
                        logger.warn('unable to find user "' + this + '"');
                    }
                });

                logger.info('loading recent messages');
                $.each(roomInfo.RecentMessages, function() {
                    this.isHistory = true;
                    $this.trigger(events.rooms.client.createMessage, [this, room]);
                });
                logger.info('finished loading recent messages');

                //TODO: ui.changeRoomTopic(roomInfo);

                // mark room as initialized to differentiate messages
                // that are added after initial population
                //TODO: ui.setInitialized(room);
                //TODO: ui.scrollToBottom(room);
                //TODO: ui.setRoomListStatuses(room);

                d.resolveWith(client.chat);

                // Watch the messages after the defer, since room messages
                // may be appended if we are just joining the room
                //TODO: ui.watchMessageScroll(messageIds, room);
            }).fail(function(e) {
                client.connection.hub.log('getRoomInfo.failed(' + room + ', ' + e + ')');
                d.rejectWith(client.chat);
            });

            return d.promise();
        }

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                users = kernel.get('jabbr/components/users');

                logger.trace('activated');
            },

            messageHistory: messageHistory,
            pendingMessages: pendingMessages,

            getRoomId: function(roomName) {
                return window.escape(roomName.toString().toLowerCase()).replace(/[^A-Za-z0-9]/g, '_');
            },
            getRoomNameFromHash: function(hash) {
                if (hash.length && hash[0] === '/') {
                    hash = hash.substr(1);
                }

                var parts = hash.split('/');
                if (parts[0] === 'rooms') {
                    return parts[1];
                }

                return null;
            },
            activeRoomChanged: function(room) {
                if (room === 'Lobby') {
                    $this.trigger(events.rooms.client.lobbyOpened);

                    // Remove the active room
                    client.chat.state.activeRoom = undefined;
                } else {
                    // When the active room changes update the client state and the cookie
                    client.chat.state.activeRoom = room;
                }

                $this.trigger(events.rooms.client.scrollToBottom, room);
                state.save(client.chat.state.activeRoom);

                historyLocation = (messageHistory[client.chat.state.activeRoom] || []).length - 1;
            },
            populateRoom: populateRoom,

            joinRoom: function(roomName) {
                logger.trace('joinRoom(' + roomName + ')');
                try {
                    client.chat.server.send('/join ' + roomName, client.chat.state.activeRoom)
                        .fail(function(e) {
                            setActiveRoom('Lobby');
                            $this.trigger(events.error, [e, 'error']);
                        });
                } catch(e) {
                    client.connection.hub.log('openRoom failed');
                }
            },
            leaveRoom: function(roomName) {
                logger.trace('leaveRoom(' + roomName + ')');
                try {
                    client.chat.server.send('/leave ' + roomName, client.chat.state.activeRoom)
                        .fail(function(e) {
                            $this.trigger(events.error, [e, 'error']);
                        });
                } catch(e) {
                    // This can fail if the server is offline
                    client.connection.hub.log('closeRoom room failed');
                }
            },

            addMessage: function(message) {
                messageIds.push(message.id);
            },

            // Preferences
            getRoomPreferenceKey: getRoomPreferenceKey,
            getRoomPreference: function(roomName, name) {
                return (preferences[getRoomPreferenceKey(roomName)] || {})[name];
            },
            setRoomPreference: function(roomName, name, value) {
                var roomPreferences = preferences[getRoomPreferenceKey(roomName)];

                if (!roomPreferences) {
                    roomPreferences = {};
                    preferences[getRoomPreferenceKey(roomName)] = roomPreferences;
                }

                roomPreferences[name] = value;

                state.save(client.chat.state.activeRoom);
            },
            getPreference: function(name) {
                return preferences[name];
            },
            setPreference: function(name, value) {
                preferences[name] = value;
                //TODO: $(ui).trigger(ui.events.preferencesChanged);
            },

            bind: function(eventType, handler) {
                $this.bind(eventType, handler);
            }
        };
    };
    
    return function() {
        if (object == null) {
            object = initialize();
            kernel.bind('jabbr/components/rooms.client', object);
        }

        return object;
    }
});