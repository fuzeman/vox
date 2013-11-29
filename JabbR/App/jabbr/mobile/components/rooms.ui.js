/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.ui',
    
    'jabbr/core/events',
    'jabbr/core/viewmodels/room',
    
    'jabbr/mobile/components/notifications',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/messages',
    'jabbr/mobile/components/lobby',
    
    'jabbr/core/components/users',
    'jabbr/core/contentproviders/core',
    'jabbr/core/messageprocessors/processor',

    'jquery.tmpl',
    'jquery.sortElements'
], function ($, Logger, kernel, RoomsUI,
    // Core
    events,

    // View Models
    Room,

    // Components
    MobileNotifications, MobileRoomsClient, MobileMessages, MobileLobby,
    users, contentProviders, processor
) {
    var logger = new Logger('jabbr/mobile/components/rooms.ui'),
        client = null,
        rc = null,
        ui = null,
        notifications = null,
        lobby = null,
        messages = null,
        templates = null,
        $document = $(document),
        $chatArea = $('#chat-area'),
        $roomList = $('#room-list'),
        $userlistContainer = $('#userlist-container'),
        lobbyLoaded = false;

    return RoomsUI.extend({
        constructor: function () {
            this.base();
            
            users = users();
            contentProviders = contentProviders();
            processor = processor();

            this.submodules = {
                notifications: new MobileNotifications(),
                rc: new MobileRoomsClient(),
                messages: new MobileMessages(),
                lobby: new MobileLobby(),
                
                users: users,
                contentProviders: contentProviders,
                processor: processor
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

            this.attach();
        },
        
        attach: function () {
            $document.on('click', '#room-list li.room-item', function () {
                var roomName = $(this).data('name');
                rc.activateOrOpenRoom(roomName);
            });

            $document.on('click', '#room-list li.room-item .close', function (ev) {
                var roomName = $(this).closest('li.room-item').data('name');

                rc.leaveRoom(roomName);

                ev.preventDefault();
                return false;
            });
        },
        
        // #region Implement RoomsUI
        
        // #region Room Elements

        getCurrentRoomElements: function () {
            var currentRoom = $roomList.find('li.current');

            if (currentRoom.length > 0) {
                return rc.getRoom(currentRoom.data('name'));
            }
            return null;
        },

        getAllRoomElements: function () {
            var _this = this,
                rooms = [];
            $roomList.find('li.room-item').each(function () {
                rooms[rooms.length] = _this.getRoomElements($(this).data("name"));
            });
            return rooms;
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
        
        // #endregion

        // #region Room Collection Methods

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
            
            userContainer = $('<div/>').attr('id', 'userlist-' + roomId)
                .addClass('users')
                .appendTo($userlistContainer).hide();
            templates.userlist.tmpl({ listname: 'Room Owners', id: 'userlist-' + roomId + '-owners' })
                .addClass('owners')
                .appendTo(userContainer);
            templates.userlist.tmpl({ listname: 'Users', id: 'userlist-' + roomId + '-active' })
                .appendTo(userContainer);

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
        
        // #endregion
        
        setActiveRoomCore: function (roomName) {
            var room = this.getRoomElements(roomName);

            // TODO this.loadRoomPreferences(roomName);

            if (room === null) {
                return false;
            }

            if (room.isActive()) {
                // Still trigger the event (just do less overall work)
                rc.activeRoomChanged(roomName);
                return true;
            }

            var currentRoom = this.getCurrentRoomElements();

            if (room.exists()) {
                if (currentRoom !== null && currentRoom.exists()) {
                    currentRoom.makeInactive();
                    if (currentRoom.isLobby()) {
                        lobby.hide();
                        // TODO $roomActions.show();
                    }
                }

                room.makeActive();

                if (room.isLobby()) {
                    // TODO $roomActions.hide();
                    lobby.show();

                    room.messages.hide();
                }

                this.trigger(events.rooms.ui.activateRoom, room);

                rc.activeRoomChanged(roomName);
                events.trigger(events.focused, room);

                return true;
            }

            return false;
        },

        updateRoom: function (roomName) {
            var roomId = rc.getRoomId(roomName),
                room = rc.rooms[rc.cleanRoomName(roomName)];

            logger.trace("Updating current room elements");

            // Update the current elements if the room has already been added
            room.tab = $('#tabs-' + roomId);
            room.users = $('#userlist-' + roomId);
            room.owners = $('#userlist-' + roomId + '-owners');
            room.activeUsers = $('#userlist-' + roomId + '-active');
            room.messages = $('#messages-' + roomId);
            room.roomTopic = $('#roomTopic-' + roomId);

            if (!rc.validRoom(roomName)) {
                logger.warn('Failed to update invalid room "' + roomName + '"');
                return false;
            }

            return true;
        },

        // #endregion
    });
});