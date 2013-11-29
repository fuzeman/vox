/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/state',
        
    'jabbr/core/viewmodels/message'
], function ($, Logger, kernel, EventObject,
    // Core
    state,
    
    // View Models
    Message
) {
    var logger = new Logger('jabbr/components/rooms.ui'),
        client = null,
        ru = null,
        rc = null,
        messages = null,
        trimRoomHistoryFrequency = 1000 * 60 * 2;  // 2 minutes in ms

    return EventObject.extend({
        constructor: function () {
            this.base();

            kernel.bind('jabbr/components/rooms.ui', this);
        },

        activate: function () {
            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            messages = kernel.get('jabbr/components/messages');

            // activate submodules
            $.each(this.submodules, function (i, module) {
                module.activate();
            });

            this.handlers.bind(this);

            setInterval($.proxy(this.trimRoomMessageHistory, this), trimRoomHistoryFrequency);

            logger.trace('activated');
        },
        
        createMessage: function (data, room) {
            var viewModel = new Message(data);

            rc.addMessage(viewModel.id);
            messages.addChatMessage(viewModel, room);
        },
        
        // #region Room Elements

        getRoomElements: function (roomName) {
            return rc.getRoom(roomName);
        },

        getCurrentRoomElements: function () { logger.warn('getCurrentRoomElements not implemented'); },
        
        getAllRoomElements: function () { logger.warn('getAllRoomElements not implemented'); },

        getNextRoomListElement: function ($targetList, roomName, count, closed) {
            logger.warn('getNextRoomListElement not implemented');
        },

        // #endregion
        
        // #region Room Collection Methods

        addRooms: function (rooms) {
            var _this = this;

            $.each(rooms, function (index, roomdata) {
                _this.addRoom(roomdata);
                var room = rc.getRoom(roomdata.Name);

                if (roomdata.Private) {
                    room.setLocked(true);
                }
                if (roomdata.Closed) {
                    room.setClosed(true);
                }
            });
        },
        
        addRoom: function (roomViewModel) { logger.warn('addRoom not implemented'); },
        
        createRoom: function (roomName) { logger.warn('createRoom not implemented'); },

        // #endregion

        setActiveRoomCore: function (roomName) { logger.warn('setActiveRoomCore not implemented'); },

        updateRoom: function (roomName) { logger.warn('updateRoom not implemented'); },
        
        updateRoomTopic: function (roomName, topic) { logger.warn('updateRoomTopic not implemented'); },
        
        trimRoomMessageHistory: function (roomName) {
            var rooms = roomName ? [rc.getRoomElements(roomName)] : this.getAllRoomElements();

            for (var i = 0; i < rooms.length; i++) {
                rooms[i].trimHistory();
            }
        },
        
        getActiveRoomPreference: function (name) {
            var room = this.getCurrentRoomElements();
            return state.getRoomPreference(room.getName(), name);
        },
        
        // #region Room Scrolling

        scrollToBottom: function (roomName) {
            var room = roomName ? this.getRoomElements(roomName) : this.getCurrentRoomElements();

            if (room.isActive()) {
                room.scrollToBottom();
            }
        },
        
        isNearTheEnd: function (roomName) {
            var room = roomName ? this.getRoomElements(roomName) : this.getCurrentRoomElements();
            
            return room.isNearTheEnd();
        },
        
        scrollIfNecessary: function (callback, room) {
            var nearEnd = this.isNearTheEnd(room);

            callback();

            if (nearEnd) {
                this.scrollToBottom(room);
            }
        },
        
        // #endregion

        // #region Chat Hub Handlers
        
        handlers: {
            bind: function (ru) {
                this.ru = ru;

                client.chat.client.joinRoom = this.joinRoom;
                client.chat.client.kick = this.kick;
            },

            joinRoom: function (roomdata) {
                var added = ru.addRoom(roomdata),
                    roomName = roomdata.Name,
                    room = rc.getRoom(roomName);

                rc.setActiveRoom(roomName);

                if (roomdata.Private) {
                    room.setLocked(true);
                }
                if (roomdata.Closed) {
                    room.setClosed(true);
                }

                if (added) {
                    rc.populateRoom(roomdata.Name).done(function () {
                        messages.addMessage('You just entered ' + roomdata.Name, 'notification', roomdata.Name);

                        if (roomdata.Welcome) {
                            messages.addMessage(roomdata.Welcome, 'welcome', roomdata.Name);
                        }
                    });
                }
            },

            kick: function (userdata, roomName, message, imageUrl) {
                if (rc.isSelf(userdata)) {
                    this.ru.showKickPopup(roomName, message, imageUrl);
                    rc.setActiveRoom('Lobby');
                    rc.removeRoom(roomName);
                    // TODO Where does this message go?
                    messages.addMessage('You were kicked from ' + roomName, 'notification');
                } else {
                    users.remove(userdata, roomName);
                    var roomMessage = userdata.Name + ' was kicked from ' + roomName;

                    if (message !== null && imageUrl !== null) {
                        roomMessage += ' (' + [message, '<a href="' + imageUrl +
                            '">' + imageUrl + '</a>'].join(' - ') + ')';
                    } else if (message !== null) {
                        roomMessage += ' (' + message + ')';
                    } else if (imageUrl !== null) {
                        roomMessage += ' (<a href="' + imageUrl + '">' + imageUrl + '</a>)';
                    }

                    messages.addMessage({ content: roomMessage, encoded: true }, 'notification', roomName);
                }
            }
        }
        
        // #endregion
    });
});