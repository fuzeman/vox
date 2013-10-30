define([
    'logger',
    'kernel',
    'jabbr/base/event-object'
], function (Logger, kernel, EventObject) {
    var logger = new Logger('jabbr/components/lobby'),
        ru = null,
        rc = null;

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.sortedRoomList = null;
            this.publicRoomList = null;

            kernel.bind('jabbr/components/lobby', this);
        },

        activate: function () {
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');

            logger.trace('activated');

            ru.createRoom('Lobby');
        },
        
        getLobby: function () {
            return ru.getRoomElements('Lobby');
        },
        
        getRooms: function () {
            return sortedRoomList;
        },

        lockRoom: function (roomName) { logger.warn('lockRoom not implemented'); },
        
        updateRooms: function () {
            var _this = this,
                d = $.Deferred();

            try {
                // Populate the user list with room names
                client.chat.server.getRooms()
                    .done(function (rooms) {
                        _this.populateRooms(rooms, client.privateRooms);
                        rc.setInitialized('Lobby');
                        d.resolveWith(client.chat);
                    });
            } catch (e) {
                client.connection.hub.log('getRooms failed');
                d.rejectWith(client.chat);
            }

            return d.promise();
        },
        
        populateRooms: function (rooms, privateRooms) { logger.warn('populateRooms not implemented'); },
        
        sortRoomList: function (listToSort) {
            var sortedList = listToSort.sort(function (a, b) {
                if (a.Closed && !b.Closed) {
                    return 1;
                } else if (b.Closed && !a.Closed) {
                    return -1;
                }

                if (a.Count > b.Count) {
                    return -1;
                } else if (b.Count > a.Count) {
                    return 1;
                }

                return a.Name.toString().toUpperCase().localeCompare(b.Name.toString().toUpperCase());
            });
            return sortedList;
        },
        
        addRoom: function (roomViewModel) { logger.warn('addRoom not implemented'); },
        
        removeRoom: function (roomName) { logger.warn('removeRoom not implemented'); },
        
        updateRoom: function (room) { logger.warn('updateRoom not implemented'); },
        
        updatePrivateRooms: function (roomName) { logger.warn('updatePrivateRooms not implemented'); },
        
        loadMoreLobbyRooms: function () { logger.warn('loadMoreLobbyRooms not implemented'); },
    });
});