/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/lobby',
        
    'jabbr/core/utility'
], function (
    $, Logger, kernel, Lobby,
    utility
) {
    var client = null,
        ru = null,
        rc = null,
        templates = null,
        $loadMoreRooms = $('#load-more-rooms-item'),
        $lobbyPrivateRooms = $('#lobby-private'),
        $lobbyOtherRooms = $('#lobby-other'),
        maxRoomsToLoad = 100;
    
    return Lobby.extend({
        constructor: function () {
            this.base();

            this.lastLoadedRoomIndex = 0;
        },
        
        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            templates = kernel.get('jabbr/templates');

            client.chat.client.updateRoom = $.proxy(this.updateRoom, this);

            this.attach();
        },
        
        attach: function () { },
        
        updateElements: function (privateSorted) {
            var lobby = this.getLobby();

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

            this.populateRoomList(this.publicRoomList.splice(0, maxRoomsToLoad), templates.lobby.room, listOfRooms);
            this.lastLoadedRoomIndex = listOfRooms.children('li').length;

            listOfRooms.children('li').appendTo(lobby.users);
            
            if (this.lastLoadedRoomIndex < this.sortedRoomList.length) {
                $loadMoreRooms.show();
            }
            
            $lobbyOtherRooms.show();
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
            $room = templates.lobby.room.tmpl(roomViewModel);
            
            var nextListElement = ru.getNextRoomListElement($targetList, roomName, count, closed);

            if (nextListElement !== null) {
                $room.insertBefore(nextListElement);
            } else {
                $room.appendTo($targetList);
            }

            // TODO this.filterIndividualRoom($room);
            //room.setListState($targetList);

            this.base(roomViewModel);

            // if it's a private room, make sure that we're displaying the private room section
            if (nonPublic) {
                $lobbyPrivateRooms.show();
                $lobbyOtherRooms.find('.nav-header').html(utility.getLanguageResource('Client_OtherRooms'));
            }
        },
    });
});