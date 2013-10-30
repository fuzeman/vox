/*global define, document*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/lobby',
    
    'keys',
    'jabbr/core/events',
    'jabbr/core/state',
    'jabbr/core/templates',
    'jabbr/core/utility'
], function (
    $, Logger, kernel, Lobby,
    Keys, events, state, templates, utility
) {
    var client = null,
        ru = null,
        rc = null,
        $document = $(document),
        $lobbyRoomFilterForm = $('#room-filter-form'),
        $closedRoomFilter = $('#room-filter-closed'),
        $loadMoreRooms = $('#load-more-rooms-item'),
        $lobbyPrivateRooms = $('#lobby-private'),
        $lobbyOtherRooms = $('#lobby-other'),
        $roomFilterInput = $('#room-filter'),
        maxRoomsToLoad = 100,
        lastLoadedRoomIndex = 0;

    return Lobby.extend({
        constructor: function () {
            this.base();
        },

        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            
            client.chat.client.updateRoom = $.proxy(this.updateRoom, this);

            this.attach();
        },
        
        attach: function () {
            var _this = this;

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
                    .each(function () { _this.filterIndividualRoom($(this)); });

                $lobbyRoomsLists.find('ul').each(function () {
                    room.setListState($(this));
                });

                return false;
            });

            $roomFilterInput.keypress(function (ev) {
                var key = ev.keyCode || ev.which,
                    roomName = $(this).val();

                if (key === Keys.Enter) {
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

                _this.loadMoreLobbyRooms();

                spinner.hide();
                spinner.removeClass('icon-spin');
                loader.html('Load More...');

                if (lastLoadedRoomIndex < _this.publicRoomList.length) {
                    $loadMoreRooms.show();
                } else {
                    $loadMoreRooms.hide();
                }
            });
        },

        lockRoom: function (roomName) {
            var $room = this.getLobby().users.find('li[data-name="' + roomName + '"]');

            $room.addClass('locked').appendTo(this.getLobby().owners);
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

                lobby.owners.empty();
                lobby.users.empty();

                var listOfPrivateRooms = $('<ul/>');
                if (privateSorted.length > 0) {
                    this.populateRoomList(privateSorted, templates.lobbyroom, listOfPrivateRooms);
                    listOfPrivateRooms.children('li').appendTo(lobby.owners);
                    $lobbyPrivateRooms.show();
                    $lobbyOtherRooms.find('.nav-header').html('Other Rooms');
                } else {
                    $lobbyPrivateRooms.hide();
                    $lobbyOtherRooms.find('.nav-header').html('Rooms');
                }

                var listOfRooms = $('<ul/>');
                this.populateRoomList(this.publicRoomList.splice(0, maxRoomsToLoad), templates.lobbyroom, listOfRooms);
                lastLoadedRoomIndex = listOfRooms.children('li').length;
                listOfRooms.children('li').appendTo(lobby.users);
                if (lastLoadedRoomIndex < this.sortedRoomList.length) {
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
        },

        populateRoomList: function (item, template, listToPopulate) {
            $.tmpl(template, item).appendTo(listToPopulate);
        },
        
        addRoom: function (roomViewModel) {
            var lobby = this.getLobby(),
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

            this.filterIndividualRoom($room);
            //room.setListState($targetList);

            rc.roomCache[roomName] = true;

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
            
            // if it's a private room, make sure that we're displaying the private room section
            if (nonPublic) {
                $lobbyPrivateRooms.show();
                $lobbyOtherRooms.find('.nav-header').html(utility.getLanguageResource('Client_OtherRooms'));
            }
        },
        
        removeRoom: function (roomName) {
            var roomNameUppercase = roomName.toString().toUpperCase(),
                i = null;
            
            if (rc.roomCache[roomNameUppercase]) {
                delete rc.roomCache[roomNameUppercase];
            }
            
            // find the element in the sorted room list and remove it
            for (i = 0; i < this.sortedRoomList.length; i++) {
                if (this.sortedRoomList[i].Name.toString().toUpperCase().localeCompare(roomNameUppercase) === 0) {
                    this.sortedRoomList.splice(i, 1);
                    break;
                }
            }
            
            // find the element in the lobby public room list and remove it
            for (i = 0; i < this.publicRoomList.length; i++) {
                if (this.publicRoomList[i].Name.toString().toUpperCase().localeCompare(roomNameUppercase) === 0) {
                    this.publicRoomList.splice(i, 1);
                    break;
                }
            }
            
            // remove the items from the lobby screen
            var lobby = this.getLobby(),
                $room = lobby.users.add(lobby.owners).find('[data-room="' + roomName + '"]');
            $room.remove();
            
            // if we have no private rooms, hide the private rooms section and change the text on the rooms header
            if (lobby.owners.find('li:not(.empty)').length === 0) {
                $lobbyPrivateRooms.hide();
                $lobbyOtherRooms.find('.nav-header').html(utility.getLanguageResource('Client_Rooms'));
            }
        },
        
        filterIndividualRoom: function ($room) {
            var filter = $roomFilterInput.val().toUpperCase(),
                showClosedRooms = $closedRoomFilter.is(':checked');

            if ($room.data('room').toString().toUpperCase().score(filter) > 0.0 &&
                (showClosedRooms || !$room.is('.closed'))) {
                $room.show();
            } else {
                $room.hide();
            }
        },
        
        updateRoom: function (room) {
            var lobby = this.getLobby(),
                $targetList = room.Private === true ? lobby.owners : lobby.users,
                $room = $targetList.find('[data-room="' + room.Name + '"]'),
                $count = $room.find('.count'),
                $topic = $room.find('.topic'),
                roomName = room.Name.toString().toUpperCase(),
                processedTopic = utility.processContent(room.Topic);

            // if we don't find the room we need to create it
            if ($room.length === 0) {
                this.addRoom(room);
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
        },
        
        updatePrivateRooms: function (roomName) {
            var lobby = this.getLobby(),
                $room = lobby.users.find('li[data-name="' + roomName + '"]');

            $room.addClass('locked').appendTo(lobby.owners);
        },
        
        loadMoreLobbyRooms: function () {
            var lobby = this.getLobby(),
                moreRooms = this.publicRoomList.slice(lastLoadedRoomIndex, lastLoadedRoomIndex + maxRoomsToLoad);

            this.populateRoomList(moreRooms, templates.lobbyroom, lobby.users);
            lastLoadedRoomIndex = lastLoadedRoomIndex + maxRoomsToLoad;

            // re-filter lists
            $lobbyRoomFilterForm.submit();
        },
        
        hideForm: function () {
            $lobbyRoomFilterForm.hide();
        },
        
        showForm: function () {
            $lobbyRoomFilterForm.show();
        }
    });
});