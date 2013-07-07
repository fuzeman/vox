/*global define*/
define([
    'jquery',
    'jabbr/client',
    'jabbr/state',
    'jabbr/templates',
    'logger'
], function ($, client, state, templates, Logger) {
    var logger = new Logger('jabbr/components/lobby');
    logger.trace('loaded');

    var $roomFilterInput = $('#room-filter'),
        $closedRoomFilter = $('#room-filter-closed'),
        $lobbyRoomFilterForm = $('#room-filter-form'),
//        $lobbyWrapper = $('#lobby-wrapper'),
        $lobbyPrivateRooms = $('#lobby-private'),
        $lobbyOtherRooms = $('#lobby-other'),
        $loadMoreRooms = $('#load-more-rooms-item');

    var ru = null,
        sortedRoomList = null,
        maxRoomsToLoad = 100,
        lastLoadedRoomIndex = 0;

    function getLobby() {
        return ru.getRoomElements('Lobby');
    }

    function updateRooms() {
        try {
            // Populate the user list with room names
            client.chat.server.getRooms()
                .done(function (rooms) {
                    populateRooms(rooms, client.getPrivateRooms());
                    //ui.setInitialized('Lobby');
                });
        } catch (e) {
            client.connection.hub.log('getRooms failed');
        }
    }

    function populateRooms(rooms, privateRooms) {
        var lobby = getLobby(),
            roomCache = ru.getRoomCache(),
            i;
        if (!lobby.isInitialized()) {
            // Populate the room cache
            for (i = 0; i < rooms.length; ++i) {
                roomCache[rooms[i].Name.toString().toUpperCase()] = true;
            }

            for (i = 0; i < privateRooms.length; ++i) {
                roomCache[privateRooms[i].Name.toString().toUpperCase()] = true;
            }

            // sort private lobby rooms
            var privateSorted = sortRoomList(privateRooms);

            // sort other lobby rooms but filter out private rooms
            sortedRoomList = sortRoomList(rooms).filter(function (room) {
                return !privateSorted.some(function (allowed) {
                    return allowed.Name === room.Name;
                });
            });

            lobby.owners.empty();
            lobby.users.empty();

            var listOfPrivateRooms = $('<ul/>');
            if (privateSorted.length > 0) {
                populateRoomList(privateSorted, templates.lobbyroom, listOfPrivateRooms);
                listOfPrivateRooms.children('li').appendTo(lobby.owners);
                $lobbyPrivateRooms.show();
                $lobbyOtherRooms.find('nav-header').html('Other Rooms');
            } else {
                $lobbyPrivateRooms.hide();
                $lobbyOtherRooms.find('nav-header').html('Rooms');
            }

            var listOfRooms = $('<ul/>');
            populateRoomList(sortedRoomList.splice(0, maxRoomsToLoad), templates.lobbyroom, listOfRooms);
            lastLoadedRoomIndex = listOfRooms.children('li').length;
            listOfRooms.children('li').appendTo(lobby.users);
            if (lastLoadedRoomIndex < sortedRoomList.length) {
                $loadMoreRooms.show();
            }
            $lobbyOtherRooms.show();
        }

        if (lobby.isActive()) {
            // update cache of room names
            $lobbyRoomFilterForm.show();
        }

        // re-filter lists
        $lobbyRoomFilterForm.submit();
    }

    function populateRoomList(item, template, listToPopulate) {
        $.tmpl(template, item).appendTo(listToPopulate);
    }

    function sortRoomList(listToSort) {
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
    }

    function addRoom(roomViewModel) {
        var lobby = getLobby(),
            $room = templates.lobbyroom.tmpl(roomViewModel),
            roomName = roomViewModel.Name.toString().toUpperCase(),
            count = roomViewModel.Count,
            closed = roomViewModel.Closed,
            $targetList = roomViewModel.Private ? lobby.owners : lobby.users;

        var nextListElement = ru.getNextRoomListElement($targetList, roomName, count, closed);

        if (nextListElement !== null) {
            $room.insertBefore(nextListElement);
        } else {
            $room.appendTo($targetList);
        }

        filterIndividualRoom($room);
    }

    function filterIndividualRoom($room) {
        var filter = $roomFilterInput.val().toUpperCase(),
            showClosedRooms = $closedRoomFilter.is(':checked');

        if ($room.data('room').toString().toUpperCase().score(filter) > 0.0 && (showClosedRooms || !$room.is('.closed'))) {
            $room.show();
        } else {
            $room.hide();
        }
    }

    //
    // Event Handlers
    //

    client.bind(client.events.lobbyOpened, function () {
        updateRooms();
    });

    return {
        initialize: function (roomui) {
            ru = roomui;
        },

        addRoom: addRoom,
        updateRooms: updateRooms,
        populateRooms: populateRooms,

        hideForm: function () {
            $lobbyRoomFilterForm.hide();
        },
        showForm: function () {
            $lobbyRoomFilterForm.show();
        }
    };
});