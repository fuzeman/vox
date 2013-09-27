/*global define, document*/
define([
    'jquery',
    'logger',
    'kernel',
    'keys',
    'jabbr/events',
    'jabbr/state',
    'jabbr/templates',
    'jabbr/utility'
], function ($, Logger, kernel, Keys, events, state, templates, utility) {
    var logger = new Logger('jabbr/components/lobby'),
        client = null,
        ru = null,
        rc = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $document = $(document),
            $roomFilterInput = $('#room-filter'),
            $closedRoomFilter = $('#room-filter-closed'),
            $lobbyRoomFilterForm = $('#room-filter-form'),
            //$lobbyWrapper = $('#lobby-wrapper'),
            $lobbyPrivateRooms = $('#lobby-private'),
            $lobbyOtherRooms = $('#lobby-other'),
            $loadMoreRooms = $('#load-more-rooms-item'),
            sortedRoomList = null,
            publicRoomList = null,
            maxRoomsToLoad = 100,
            lastLoadedRoomIndex = 0;

        function getLobby() {
            return ru.getRoomElements('Lobby');
        }

        function updateRooms() {
            var d = $.Deferred();

            try {
                // Populate the user list with room names
                client.chat.server.getRooms()
                    .done(function (rooms) {
                        populateRooms(rooms, client.getPrivateRooms());
                        rc.setInitialized('Lobby');
                        d.resolveWith(client.chat);
                    });
            } catch (e) {
                client.connection.hub.log('getRooms failed');
                d.rejectWith(client.chat);
            }

            return d.promise();
        }

        function lockRoom(roomName) {
            var $room = getLobby().users.find('li[data-name="' + roomName + '"]');

            $room.addClass('locked').appendTo(getLobby().owners);
        }

        function populateRooms(rooms, privateRooms) {
            var lobby = getLobby(),
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
                var privateSorted = sortRoomList(privateRooms);

                // sort other lobby rooms but filter out private rooms
                publicRoomList = sortRoomList(rooms).filter(function (room) {
                    return !privateSorted.some(function (allowed) {
                        return allowed.Name === room.Name;
                    });
                });


                sortedRoomList = rooms.sort(function(a, b) {
                    return a.Name.toString().toUpperCase().localeCompare(b.Name.toString().toUpperCase());
                });

                lobby.owners.empty();
                lobby.users.empty();

                var listOfPrivateRooms = $('<ul/>');
                if (privateSorted.length > 0) {
                    populateRoomList(privateSorted, templates.lobbyroom, listOfPrivateRooms);
                    listOfPrivateRooms.children('li').appendTo(lobby.owners);
                    $lobbyPrivateRooms.show();
                    $lobbyOtherRooms.find('.nav-header').html('Other Rooms');
                } else {
                    $lobbyPrivateRooms.hide();
                    $lobbyOtherRooms.find('.nav-header').html('Rooms');
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
                room = null,
                $room = null,
                roomName = roomViewModel.Name.toString().toUpperCase(),
                count = roomViewModel.Count,
                closed = roomViewModel.Closed,
                nonPublic = roomViewModel.Private,
                $targetList = roomViewModel.Private ? lobby.owners : lobby.users,
                i = null;

            roomViewModel.processedTopic = utility.processContent(roomViewModel.Topic);
            $room = templates.lobbyroom.tmpl(roomViewModel);
            //room = ru.getRoomElements(roomName);

            var nextListElement = ru.getNextRoomListElement($targetList, roomName, count, closed);

            if (nextListElement !== null) {
                $room.insertBefore(nextListElement);
            } else {
                $room.appendTo($targetList);
            }

            filterIndividualRoom($room);
            //room.setListState($targetList);

            rc.roomCache[roomName] = true;

            // don't try to populate the sortedRoomList while we're initially filling up the lobby
            if (sortedRoomList) {
                var sortedRoomInsertIndex = sortedRoomList.length;
                for (i = 0; i < sortedRoomList.length; i++) {
                    if (sortedRoomList[i].Name.toString().toUpperCase().localeCompare(roomName) > 0) {
                        sortedRoomInsertIndex = i;
                        break;
                    }
                }
                sortedRoomList.splice(sortedRoomInsertIndex, 0, roomViewModel);
            }
            
            // handle updates on rooms not currently displayed to clients by removing from the public room list
            if (publicRoomList) {
                for (i = 0; i < publicRoomList.length; i++) {
                    if (publicRoomList[i].Name.toString().toUpperCase().localeCompare(roomName) === 0) {
                        publicRoomList.splice(i, 1);
                        break;
                    }
                }
            }
            
            // if it's a private room, make sure that we're displaying the private room section
            if (nonPublic) {
                $lobbyPrivateRooms.show();
                $lobbyOtherRooms.find('.nav-header').html(utility.getLanguageResource('Client_OtherRooms'));
            }
        }

        function removeRoom(roomName) {
            var roomNameUppercase = roomName.toString().toUpperCase(),
                i = null;
            
            if (rc.roomCache[roomNameUppercase]) {
                delete rc.roomCache[roomNameUppercase];
            }
            
            // find the element in the sorted room list and remove it
            for (i = 0; i < sortedRoomList.length; i++) {
                if (sortedRoomList[i].Name.toString().toUpperCase().localeCompare(roomNameUppercase) === 0) {
                    sortedRoomList.splice(i, 1);
                    break;
                }
            }
            
            // find the element in the lobby public room list and remove it
            for (i = 0; i < publicRoomList.length; i++) {
                if (publicRoomList[i].Name.toString().toUpperCase().localeCompare(roomNameUppercase) === 0) {
                    publicRoomList.splice(i, 1);
                    break;
                }
            }
            
            // remove the items from the lobby screen
            var lobby = getLobby(),
                $room = lobby.users.add(lobby.owners).find('[data-room="' + roomName + '"]');
            $room.remove();
            
            // if we have no private rooms, hide the private rooms section and change the text on the rooms header
            if (lobby.owners.find('li:not(.empty)').length === 0) {
                $lobbyPrivateRooms.hide();
                $lobbyOtherRooms.find('.nav-header').html(utility.getLanguageResource('Client_Rooms'));
            }
        }

        function filterIndividualRoom($room) {
            var filter = $roomFilterInput.val().toUpperCase(),
                showClosedRooms = $closedRoomFilter.is(':checked');

            if ($room.data('room').toString().toUpperCase().score(filter) > 0.0 &&
                (showClosedRooms || !$room.is('.closed'))) {
                $room.show();
            } else {
                $room.hide();
            }
        }

        function updateRoom(room) {
            var lobby = getLobby(),
                $targetList = room.Private === true ? lobby.owners : lobby.users,
                $room = $targetList.find('[data-room="' + room.Name + '"]'),
                $count = $room.find('.count'),
                $topic = $room.find('.topic'),
                roomName = room.Name.toString().toUpperCase(),
                processedTopic = utility.processContent(room.Topic);

            // if we don't find the room we need to create it
            if ($room.length === 0) {
                addRoom(room);
                return;
            }

            if (room.Count === 0) {
                $count.text('Unoccupied');
            } else if (room.Count === 1) {
                $count.text('1 occupant');
            } else {
                $count.text(room.Count + ' occupants');
            }

            if (room.Private === true) {
                $room.addClass('locked');
            } else {
                $room.removeClass('locked');
            }

            if (room.Closed === true) {
                $room.addClass('closed');
            } else {
                $room.removeClass('closed');
            }

            $topic.html(processedTopic);

            var nextListElement = ru.getNextRoomListElement($targetList, roomName, room.Count, room.Closed);

            $room.data('count', room.Count);
            if (nextListElement !== null) {
                $room.insertBefore(nextListElement);
            } else {
                $room.appendTo($targetList);
            }

            // Do a little animation
            $room.css('-webkit-animation-play-state', 'running').css('animation-play-state', 'running'); 
        }

        function updatePrivateRooms(roomName) {
            var lobby = getLobby(),
                $room = lobby.users.find('li[data-name="' + roomName + '"]');

            $room.addClass('locked').appendTo(lobby.owners);
        }

        function getRooms() {
            return sortedRoomList;
        }

        function loadMoreLobbyRooms() {
            var lobby = getLobby(),
                moreRooms = publicRoomList.slice(lastLoadedRoomIndex, lastLoadedRoomIndex + maxRoomsToLoad);

            populateRoomList(moreRooms, templates.lobbyroom, lobby.users);
            lastLoadedRoomIndex = lastLoadedRoomIndex + maxRoomsToLoad;

            // re-filter lists
            $lobbyRoomFilterForm.submit();
        }

        //
        // Event Handlers
        //

        // #region DOM Event Handlers

        $roomFilterInput
            .bind('input', function () {
                $lobbyRoomFilterForm.submit();
            })
            .keyup(function () {
                $lobbyRoomFilterForm.submit();
            });

        $closedRoomFilter.click(function () {
            $lobbyRoomFilterForm.submit();
        });

        $lobbyRoomFilterForm.submit(function () {
            var room = ru.getCurrentRoomElements(),
                $lobbyRoomsLists = $lobbyPrivateRooms.add($lobbyOtherRooms);

            // hide all elements except those that match the input / closed filters
            $lobbyRoomsLists
                .find('li:not(.empty)')
                .each(function () { filterIndividualRoom($(this)); });

            $lobbyRoomsLists.find('ul').each(function () {
                room.setListState($(this));
            });

            return false;
        });

        $roomFilterInput.keypress(function (ev) {
            var key = ev.keyCode || ev.which,
                roomName = $(this).val();

            if (key == Keys.Enter) {
                // only if it's an exact match
                if (rc.inRoomCache(roomName)) {
                    rc.activateOrOpenRoom(roomName);
                    return;
                }
            }
        });

        $document.on('click', '#load-more-rooms-item', function () {
            var spinner = $loadMoreRooms.find('i');
            spinner.addClass('icon-spin');
            spinner.show();
            var loader = $loadMoreRooms.find('.load-more-rooms a');
            loader.html(' Loading more rooms...');

            loadMoreLobbyRooms();

            spinner.hide();
            spinner.removeClass('icon-spin');
            loader.html('Load More...');

            if (lastLoadedRoomIndex < publicRoomList.length) {
                $loadMoreRooms.show();
            } else {
                $loadMoreRooms.hide();
            }
        });

        // #endregion

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ru = kernel.get('jabbr/components/rooms.ui');
                rc = kernel.get('jabbr/components/rooms.client');

                logger.trace('activated');

                client.chat.client.updateRoom = updateRoom;

                ru.createRoom('Lobby');
            },

            addRoom: addRoom,
            removeRoom: removeRoom,

            updateRooms: updateRooms,
            updatePrivateRooms: updatePrivateRooms,

            lockRoom: lockRoom,

            populateRooms: populateRooms,
            getRooms: getRooms,

            hideForm: function () {
                $lobbyRoomFilterForm.hide();
            },
            showForm: function () {
                $lobbyRoomFilterForm.show();
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/lobby', object);
        }

        return object;
    };
});