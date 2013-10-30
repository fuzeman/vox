define([
    'logger',
    'kernel',
    'jabbr/base/event-object'
], function (Logger, kernel, EventObject) {
    var logger = new Logger('jabbr/components/rooms.ui'),
        client = null,
        ru = null,
        rc = null,
        messages = null;

    return EventObject.extend({
        constructor: function() {
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

            this.handlers.bind();

            logger.trace('activated');
        },
        
        getCurrentRoomElements: function () { logger.warn('getCurrentRoomElements not implemented'); },
        
        getRoomElements: function (roomName) {
            return rc.getRoom(roomName);
        },
        
        getNextRoomListElement: function ($targetList, roomName, count, closed) { logger.warn('getNextRoomListElement not implemented'); },

        
        createRoom: function (roomName) { logger.warn('createRoom not implemented'); },
        
        setActiveRoomCore: function (roomName) { logger.warn('setActiveRoomCore not implemented'); },

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
        
        updateRoom: function (roomName) { logger.warn('updateRoom not implemented'); },
        
        updateRoomTopic: function (roomName, topic) { logger.warn('updateRoomTopic not implemented'); },
        
        // Hub Handlers
        handlers: {
            bind: function () {
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
                    showKickPopup(roomName, message, imageUrl);
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
        },
    });
});