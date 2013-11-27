/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
        
    'jabbr/core/utility'
], function ($, Logger, kernel, EventObject, utility) {
    var logger = new Logger('jabbr/components/lobby'),
        client = null,
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
            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');

            logger.trace('activated');

            ru.createRoom('Lobby');
        },
        
        getLobby: function () {
            return ru.getRoomElements('Lobby');
        },
        
        getRooms: function () {
            return this.sortedRoomList;
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
        
        populateRooms: function (rooms, privateRooms) {
            var lobby = this.getLobby(),
                i;

            if (!lobby.isInitialized()) {
                // Process the topics
                for (i = 0; i < rooms.length; ++i) {
                    rooms[i].processedTopic = utility.processContent(rooms[i].Topic);
                }

                for (i = 0; i < privateRooms.length; ++i) {
                    privateRooms[i].processedTopic = utility.processContent(privateRooms[i].Topic);
                }

                // Populate the room cache
                for (i = 0; i < rooms.length; ++i) {
                    rc.roomCache[rc.cleanRoomName(rooms[i].Name)] = true;
                }

                for (i = 0; i < privateRooms.length; ++i) {
                    rc.roomCache[rc.cleanRoomName(privateRooms[i].Name)] = true;
                }

                // sort private lobby rooms
                var privateSorted = this.sortRoomList(privateRooms);

                // sort other lobby rooms but filter out private rooms
                this.publicRoomList = this.sortRoomList(rooms).filter(function (room) {
                    return !privateSorted.some(function (allowed) {
                        return allowed.Name === room.Name;
                    });
                });


                this.sortedRoomList = rooms.sort(function (a, b) {
                    return a.Name.toString().toUpperCase().localeCompare(b.Name.toString().toUpperCase());
                });

                this.updateElements(privateSorted);
            }
        },
        
        updateElements: function (privateSorted) { logger.warn('updateElements not implemented'); },
        
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
        
        addRoom: function (roomViewModel) {
            var roomName = roomViewModel.Name.toString().toUpperCase();

            rc.roomCache[roomName] = true;

            this.updateRoomLists(roomViewModel, roomName);
        },
        
        updateRoomLists: function (roomViewModel, roomName) {
            var i = null;

            // don't try to populate the sortedRoomList while we're initially filling up the lobby
            if (this.sortedRoomList) {
                var sortedRoomInsertIndex = this.sortedRoomList.length;
                for (i = 0; i < this.sortedRoomList.length; i++) {
                    if (this.sortedRoomList[i].Name.toString().toUpperCase().localeCompare(roomName) > 0) {
                        sortedRoomInsertIndex = i;
                        break;
                    }
                }
                this.sortedRoomList.splice(sortedRoomInsertIndex, 0, roomViewModel);
            }

            // handle updates on rooms not currently displayed to clients by removing from the public room list
            if (this.publicRoomList) {
                for (i = 0; i < this.publicRoomList.length; i++) {
                    if (this.publicRoomList[i].Name.toString().toUpperCase().localeCompare(roomName) === 0) {
                        this.publicRoomList.splice(i, 1);
                        break;
                    }
                }
            }
        },

        removeRoom: function (roomName) { logger.warn('removeRoom not implemented'); },
        
        updateRoom: function (room) { logger.warn('updateRoom not implemented'); },
        
        updatePrivateRooms: function (roomName) { logger.warn('updatePrivateRooms not implemented'); },
        
        loadMoreLobbyRooms: function () { logger.warn('loadMoreLobbyRooms not implemented'); }
    });
});