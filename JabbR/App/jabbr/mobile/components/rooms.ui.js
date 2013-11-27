/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.ui',
    
    'jabbr/core/viewmodels/room',
    
    'jabbr/mobile/components/notifications',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/messages',
    'jabbr/mobile/components/lobby',
        
    'jquery.tmpl',
    'jquery.sortElements'
], function ($, Logger, kernel, RoomsUI,

    // View Models
    Room,

    // Components
    MobileNotifications, MobileRoomsClient, MobileMessages, MobileLobby
) {
    var logger = new Logger('jabbr/desktop/components/rooms.ui'),
        client = null,
        rc = null,
        ui = null,
        notifications = null,
        lobby = null,
        messages = null,
        templates = null,
        $chatArea = $('#chat-area'),
        $roomList = $('#room-list'),
        $userList = $('#user-list');

    return RoomsUI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                notifications: new MobileNotifications(),
                rc: new MobileRoomsClient(),
                messages: new MobileMessages(),
                lobby: new MobileLobby()
            };

            rc = this.submodules.rc;
        },
        
        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            notifications = kernel.get('jabbr/components/notifications');
            lobby = kernel.get('jabbr/components/lobby');
            messages = kernel.get('jabbr/components/messages');
            templates = kernel.get('jabbr/templates');
        },
        
        getNextRoomListElement: function ($targetList, roomName, count, closed) {
            var nextListElement = null;

            // move the item to before the next element
            $targetList.find('li').each(function () {
                var $this = $(this),
                    liRoomCount = $this.data('count'),
                    liRoomClosed = $this.hasClass('closed'),
                    name = $this.data('name'),
                    nameComparison;

                if (name === undefined) {
                    return true;
                }

                nameComparison = name.toString().toUpperCase().localeCompare(roomName);

                // skip this element
                if (nameComparison === 0) {
                    return true;
                }

                // skip closed rooms which always go after unclosed ones
                if (!liRoomClosed && closed) {
                    return true;
                }

                // skip where we have more occupants
                if (liRoomCount > count) {
                    return true;
                }

                // skip where we have the same number of occupants but the room is alphabetically earlier
                if (liRoomCount === count && nameComparison < 0) {
                    return true;
                }

                nextListElement = $this;
                return false;
            });

            return nextListElement;
        },
        
        addRoom: function (roomViewModel) {
            // Do nothing if the room exists
            var roomName = roomViewModel.Name;
            logger.trace("addRoom(" + roomName + ")");

            if (rc.hasRoom(roomViewModel.Name)) {
                if (!rc.validRoom(roomViewModel.Name)) {
                    this.updateRoom(roomViewModel.Name);
                }
                return false;
            }

            var room = this.createRoom(roomViewModel.Name),
                roomId = null,
                viewModel = null,
                $messages = null,
                $roomTopic = null,
                scrollHandler = null,
                userContainer = null;
            
            roomId = rc.getRoomId(roomName);
            
            // Add the tab
            viewModel = {
                id: roomId,
                name: roomName,
                closed: roomViewModel.Closed
            };
            
            if (!rc.inRoomCache(roomName)) {
                lobby.addRoom(roomViewModel);
            }
            
            templates.drawer.room.tmpl(viewModel).data('name', roomName).appendTo($roomList);
            
            $messages = $('<ul/>').attr('id', 'messages-' + roomId)
                .addClass('messages')
                .appendTo($chatArea)
                .hide();
            
            $roomList.find('li.room-item')
                .not('.lobby')
                .sortElements(function (a, b) {
                    return rc.cleanRoomName($(a).data('name')) > rc.cleanRoomName($(b).data('name')) ? 1 : -1;
                });
            
            lobbyLoaded = false;
            return true;
        },
        
        createRoom: function (roomName) {
            if (!rc.hasRoom(roomName)) {
                logger.trace("Creating room '" + roomName + "'");
                var roomId = rc.getRoomId(roomName);
                rc.rooms[rc.cleanRoomName(roomName)] = new Room(
                    $('#tabs-' + roomId),
                    $('#userlist-' + roomId),
                    $('#userlist-' + roomId + '-owners'),
                    $('#userlist-' + roomId + '-active'),
                    $('#messages-' + roomId),
                    $('#roomTopic-' + roomId)
                );

                if (rc.validRoom(roomName)) {
                    return rc.rooms[rc.cleanRoomName(roomName)];
                } else {
                    logger.warn('Failed to create room "' + roomName + '"');
                    return null;
                }
            }

            return rc.getRoom(roomName);
        },
    });
});