/*global define*/
define([
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/events',
    'jabbr/core/state',
    
    'jquery.history'
], function (Logger, kernel, EventObject, events, state) {
    var logger = new Logger('jabbr/components/rooms.client'),
        client = null,
        ru = null;

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.rooms = {};  // Joined Rooms
            this.roomCache = {};  // Available Rooms

            this.messageIds = [];
            this.messageHistory = {};
            this.historyLocation = 0;
            
            this.loadingHistory = false;

            kernel.bind('jabbr/components/rooms.client', this);
        },
        
        activate: function () {
            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');

            logger.trace('activated');
            
            //
            // Bind hub events
            //

            client.chat.client.roomClosed = $.proxy(this.roomClosed, this);
            client.chat.client.roomUnClosed = $.proxy(this.roomUnClosed, this);
            client.chat.client.roomLoaded = $.proxy(this.roomLoaded, this);
            client.chat.client.lockRoom = $.proxy(this.lockRoom, this);

            client.chat.client.listUsers = $.proxy(this.listUsers, this);
            client.chat.client.listAllowedUsers = $.proxy(this.listAllowedUsers, this);
            
            client.chat.client.showUsersRoomList = $.proxy(this.showUsersRoomList, this);
            client.chat.client.showUsersInRoom = $.proxy(this.showUsersInRoom, this);
            client.chat.client.showUserInfo = $.proxy(this.showUserInfo, this);

            client.chat.client.leave = $.proxy(this.leave, this);
        },
        
        // #region Chat hub handlers
        
        roomClosed: function (roomName) { logger.warn('roomClosed not implemented'); },

        roomUnClosed: function (roomName) { logger.warn('roomUnClosed not implemented'); },

        roomLoaded: function (roomInfo) {
            this.populateRoomFromInfo(roomInfo);
        },
        
        lockRoom: function (userdata, roomName, userHasAccess) { logger.warn('lockRoom not implemented'); },
        

        listUsers: function (userlist) { logger.warn('listUsers not implemented'); },
        
        listAllowedUsers: function (roomName, isPrivate, allowedUsers) { logger.warn('listAllowedUsers not implemented'); },


        showUsersRoomList: function (user, rooms) { logger.warn('showUsersRoomList not implemented'); },
        
        showUsersInRoom: function (roomName, usernames) { logger.warn('showUsersInRoom not implemented'); },

        showUserInfo: function (user) { logger.warn('showUserInfo not implemented'); },
        

        leave: function (userdata, roomName) { logger.warn('leave not implemented'); },

        // #endregion
        
        isSelf: function (userdata) {
            return client.chat.state.name === userdata.Name;
        },
        
        addMessage: function (message) {
            this.messageIds.push(message.id);
        },
        
        populateRoom: function (room) {
            var d = $.Deferred();

            client.connection.hub.log('getRoomInfo(' + room + ')');

            // Populate the list of users rooms and messages
            client.chat.server.getRoomInfo(room)
                .done($.proxy(function (roomInfo) {
                    client.connection.hub.log('getRoomInfo.done(' + room + ')');

                    this.populateRoomFromInfo(roomInfo);

                    d.resolveWith(client.chat);
                }, this))
                .fail(function (e) {
                    client.connection.hub.log('getRoomInfo.failed(' + room + ', ' + e + ')');
                    d.rejectWith(client.chat);
                });

            return d.promise();
        },
        
        populateRoomFromInfo: function (roomInfo) { logger.warn('populateRoomFromInfo not implemented'); },
        
        // #region Room functions

        cleanRoomName: function (roomName) {
            if (roomName === null) {
                return "";
            }
            return roomName.toString().toUpperCase();
        },
        
        hasRoom: function (roomName) {
            return this.cleanRoomName(roomName) in this.rooms;
        },
        
        validRoom: function (roomName) {
            return this.rooms[this.cleanRoomName(roomName)].exists();
        },
        
        inRoomCache: function (roomName) {
            return this.cleanRoomName(roomName) in this.roomCache;
        },
        
        getRoom: function (roomName) {
            if (!this.hasRoom(roomName)) {
                return null;
            }
            if (!this.validRoom(roomName)) {
                if (!ru.updateRoom(roomName)) {
                    return null;
                }
            }
            return this.rooms[this.cleanRoomName(roomName)];
        },
        
        getRoomId: function (roomName) {
            return window.escape(roomName.toString().toLowerCase()).replace(/[^A-Za-z0-9]/g, '_');
        },
        
        setRoomTrimmable: function (roomName, canTrimMessages) {
            var room = this.getRoom(roomName);
            room.setTrimmable(canTrimMessages);
        },

        setRoomListStatuses: function (roomName) {
            var room = roomName ? this.getRoom(roomName) : ru.getCurrentRoomElements();
            room.setListState(room.owners);
        },
        
        setInitialized: function (roomName) {
            var room = roomName ? this.getRoom(roomName) : ru.getCurrentRoomElements();
            room.setInitialized();
        },

        // #region Join, Leave

        joinRoom: function (roomName) {
            logger.trace('joinRoom(' + roomName + ')');
            try {
                client.chat.server.send('/join ' + roomName, client.chat.state.activeRoom)
                    .fail($.proxy(function (e) {
                        // TODO: setActiveRoom('Lobby');
                        if (e.source === 'HubException') {
                            this.trigger(events.error, [e, 'error']);
                        }
                    }, this));
            } catch (e) {
                client.connection.hub.log('openRoom failed');
            }
        },
        
        leaveRoom: function (roomName) {
            logger.trace('leaveRoom(' + roomName + ')');
            try {
                client.chat.server.send('/leave ' + roomName, client.chat.state.activeRoom)
                    .fail($.proxy(function (e) {
                        if (e.source === 'HubException') {
                            this.trigger(events.error, [e, 'error']);
                        }
                    }, this));
            } catch (e) {
                // This can fail if the server is offline
                client.connection.hub.log('closeRoom room failed');
            }
        },
        
        // #endregion
        
        removeRoom: function (roomName) { logger.warn('removeRoom not implemented'); },

        scrollRoomTop: function (roomInfo) { logger.warn('scrollRoomTop not implemented'); },

        // #endregion

        // #region Open room from hash
        
        getRoomNameFromHash: function (hash) {
            if (hash.length && hash[0] === '/') {
                hash = hash.substr(1);
            }

            var parts = hash.split('/');
            if (parts[0] === 'rooms') {
                return parts[1];
            }

            return null;
        },

        openRoomFromHash: function () {
            $.history.init($.proxy(function (hash) {
                var roomName = this.getRoomNameFromHash(hash);

                if (roomName) {
                    if (ru.setActiveRoomCore(roomName) === false &&
                        roomName !== 'Lobby') {
                        this.joinRoom(roomName);
                    }
                }
            }, this));
        },
        
        // #endregion
        
        // #region Active, Open Rooms

        setActiveRoom: function (roomName) {
            logger.trace('setActiveRoom(' + roomName + ')');

            var hash = (document.location.hash || '#').substr(1),
                hashRoomName = this.getRoomNameFromHash(hash);

            if (hashRoomName && hashRoomName === roomName) {
                ru.setActiveRoomCore(roomName);
            } else {
                document.location.hash = '#/rooms/' + roomName;
            }
        },
        
        activateOrOpenRoom: function (roomName) {
            logger.trace('activateOrOpenRoom(' + roomName + ')');

            if (this.hasRoom(roomName)) {
                this.setActiveRoom(roomName);
            } else {
                this.joinRoom(roomName);
            }
        },

        activeRoomChanged: function (room) {
            if (room === 'Lobby') {
                // Remove the active room
                client.chat.state.activeRoom = undefined;
            } else {
                // When the active room changes update the client state and the cookie
                client.chat.state.activeRoom = room;
            }

            this.trigger(events.rooms.client.scrollToBottom, room);
            state.save(client.chat.state.activeRoom);

            this.historyLocation = (this.messageHistory[client.chat.state.activeRoom] || []).length;
        },
        
        // #endregion
    });
});