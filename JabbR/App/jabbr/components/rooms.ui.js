define([
    'jabbr/client',
    'jabbr/state',
    'jabbr/templates',
    'jabbr/viewmodels/room',
    'jabbr/viewmodels/message',
    'jabbr/components/rooms.client',
    'jabbr/components/users',
    'jabbr/components/lobby',
    'jabbr/components/messages',
    
    'jquery-migrate',
    'jquery.history',
    'jquery.tmpl',
    'jquery.sortElements',
    'quicksilver'
], function(client, state, templates, Room, Message, rc, users, lobby, messages) {
    console.log('[jabbr/components/rooms.ui]');

    var ru = {};

    var events = {
        activateRoom: 'jabbr.components.rooms.ui.activateRoom',
        focusRoom: 'jabbr.components.rooms.ui.focusRoom'
    };

    var $toast = $('#room-preferences .toast'),
        $sound = $('#room-preferences .sound'),
        $richness = $('#room-preferences .richness'),
        $roomActions = $('#room-actions'),
        $notify = $('#room-actions .notify'),
        $tabs = $('#tabs'),
        $chatArea = $('#chat-area'),
        $topicBar = $('#topic-bar');

    var $this = $(this),
        roomCache = {},
        scrollTopThreshold = 75,
        lobbyLoaded = false;

    //
    // Private Functions
    //

    // Elements

    function getRoomElements(roomName) {
        console.log("getRoomElements(" + roomName + ")");

        var roomId = rc.getRoomId(roomName);
        var room = new Room($('#tabs-' + roomId),
            $('#userlist-' + roomId),
            $('#userlist-' + roomId + '-owners'),
            $('#userlist-' + roomId + '-active'),
            $('#messages-' + roomId),
            $('#roomTopic-' + roomId));
        return room;
    }

    function getCurrentRoomElements() {
        var $tab = $tabs.find('li.current');
        var room;
        if ($tab.data('name') === 'Lobby') {
            room = new Room($tab,
                $('#userlist-lobby'),
                $('#userlist-lobby-owners'),
                $('#userlist-lobby-active'),
                $('.messages.current'),
                $('.roomTopic.current'));
        } else {
            room = new Room($tab,
                $('.users.current'),
                $('.userlist.current .owners'),
                $('.userlist.current .active'),
                $('.messages.current'),
                $('.roomTopic.current'));
        }
        return room;
    }

    function getNextRoomListElement($targetList, roomName, count, closed) {
        var nextListElement = null;

        // move the item to before the next element
        $targetList.find('li').each(function() {
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
    }

    // Preferences

    function loadRoomPreferences(roomName) {
        var roomPreferences = rc.getRoomPreference(roomName);

        // Set defaults
        if (rc.getRoomPreference(roomName, 'hasSound') === undefined) {
            rc.setRoomPreference(roomName, 'hasSound', true);
        }

        // Placeholder for room level preferences
        toggleElement($sound, 'hasSound', roomName);
        toggleElement($toast, 'canToast', roomName);
        toggleRichness($richness, roomName);
        toggleNotify($notify, roomName);
    }

    function toggleRichness($element, roomName) {
        var blockRichness = roomName ? rc.getRoomPreference(roomName, 'blockRichness') : preferences.blockRichness;

        if (blockRichness === true) {
            $element.addClass('off');
        } else {
            $element.removeClass('off');
        }
    }

    function toggleNotify($element, roomName) {
        var notifyState = rc.getRoomPreference(roomName, 'notify') || 'mentions';

        if (notifyState == 'all' && $element.hasClass('notify-mentions')) {
            $element.removeClass('notify-mentions');
            $element.addClass('notify-all');
            $('.notify-text', $element).text('All');
        } else if (notifyState == 'mentions' && $element.hasClass('notify-all')) {
            $element.removeClass('notify-all');
            $element.addClass('notify-mentions');
            $('.notify-text', $element).text('Mentions');
        }
    }

    function toggleElement($element, preferenceName, roomName) {
        var value = roomName ? rc.getRoomPreference(roomName, preferenceName) : preferences[preferenceName];

        if (value === true) {
            $element.removeClass('off');
        } else {
            $element.addClass('off');
        }
    }

    // Room Navigation/Loading

    function openRoom(room) {
        try {
            client.chat.server.send('/join ' + room, client.chat.state.activeRoom)
                .fail(function(e) {
                    //ui.setActiveRoom('Lobby');
                    //ui.addMessage(e, 'error');
                });
        } catch(e) {
            client.connection.hub.log('openRoom failed');
        }
    }

    function setActiveRoomCore(roomName) {
        console.log("setActiveRoomCore (" + roomName + ")");

        var room = getRoomElements(roomName);

        loadRoomPreferences(roomName);

        if (room.isActive()) {
            // Still trigger the event (just do less overall work)
            rc.setActiveRoom(roomName);
            return true;
        }

        var currentRoom = getCurrentRoomElements();

        if (room.exists()) {
            if (currentRoom.exists()) {
                currentRoom.makeInactive();
                if (currentRoom.isLobby()) {
                    lobby.hideForm();
                    $roomActions.show();
                }
            }

            room.makeActive();

            if (room.isLobby()) {
                $roomActions.hide();
                lobby.showForm();

                room.messages.hide();
            }

            $this.trigger(events.activateRoom, room);

            rc.setActiveRoom(roomName);

            $this.trigger(events.focusRoom, room);

            return true;
        }

        return false;
    }

    function setAccessKeys() {
        $.each($tabs.find('li.room'), function(index, item) {
            $(item).children('button').attr('accesskey', getRoomAccessKey(index));
        });
    }

    function getRoomAccessKey(index) {
        if (index < 10) {
            return index + 1;
        }
        return 0;
    }

    function addRoom(roomViewModel) {
        // Do nothing if the room exists
        var roomName = roomViewModel.Name;
        console.log("adding room: " + roomName);

        var room = getRoomElements(roomViewModel.Name),
            roomId = null,
            viewModel = null,
            $messages = null,
            $roomTopic = null,
            scrollHandler = null,
            userContainer = null;

        if (room.exists()) {
            return false;
        }

        roomId = rc.getRoomId(roomName);

        // Add the tab
        viewModel = {
            id: roomId,
            name: roomName,
            closed: roomViewModel.Closed
        };

        if (!roomCache[roomName.toString().toUpperCase()]) {
            lobby.addRoom(roomViewModel);
        }

        roomCache[roomName.toString().toUpperCase()] = true;

        templates.tab.tmpl(viewModel).data('name', roomName).appendTo($tabs);

        $messages = $('<ul/>').attr('id', 'messages-' + roomId)
            .addClass('messages')
            .appendTo($chatArea)
            .hide();

        $roomTopic = $('<div/>').attr('id', 'roomTopic-' + roomId)
            .addClass('roomTopic')
            .appendTo($topicBar)
            .hide();

        userContainer = $('<div/>').attr('id', 'userlist-' + roomId)
            .addClass('users')
            .appendTo($chatArea).hide();
        templates.userlist.tmpl({ listname: 'Room Owners', id: 'userlist-' + roomId + '-owners' })
            .addClass('owners')
            .appendTo(userContainer);
        templates.userlist.tmpl({ listname: 'Users', id: 'userlist-' + roomId + '-active' })
            .appendTo(userContainer);

        $tabs.find('li')
            .not('.lobby')
            .sortElements(function(a, b) {
                return $(a).data('name').toString().toUpperCase() > $(b).data('name').toString().toUpperCase() ? 1 : -1;
            });

        scrollHandler = function(ev) {
            var messageId = null;

            // Do nothing if there's nothing else
            if ($(this).data('full') === true) {
                return;
            }

            // If you're we're near the top, raise the event, but if the scroll
            // bar is small enough that we're at the bottom edge, ignore it.
            // We have to use the ui version because the room object above is
            // not fully initialized, so there are no messages.
            if ($(this).scrollTop() <= scrollTopThreshold && !ui.isNearTheEnd(roomId)) {
                var $child = $messages.children('.message:first');
                if ($child.length > 0) {
                    messageId = $child.attr('id')
                        .substr(2); // Remove the "m-"
                    //$ui.trigger(ui.events.scrollRoomTop, [{ name: roomName, messageId: messageId }]);
                }
            }
        };

        // Hookup the scroll handler since event delegation doesn't work with scroll events
        $messages.bind('scroll', scrollHandler);

        // Store the scroll handler so we can remove it later
        $messages.data('scrollHandler', scrollHandler);

        setAccessKeys();

        lobbyLoaded = false;
        return true;
    }

    function scrollToBottom(roomName) {
        console.log("scrollToBottom(" + roomName + ")");
        var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

        if (room.isActive()) {
            room.scrollToBottom();
        }
    }

    //
    // Event Handlers
    //

    // Room Client

    rc.bind(rc.events.activateRoom, function(event, activateRoom) {
        scrollToBottom(activateRoom);
    });

    rc.bind(rc.events.addUser, function(event, userdata, room) {
        var user = users.add(userdata, room);
        user.updateActivity();
    });

    rc.bind(rc.events.createMessage, function(event, data, room) {
        var viewModel = new Message(ru, data);

        rc.addMessage(viewModel.id);
        messages.addChatMessage(viewModel, room);
    });

    // Client

    client.bind(client.events.updateUnread, function (event, roomName, isMentioned) {
        console.log("updateUnread(" + roomName + ", " + isMentioned + ")");
        var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

        if (focus && room.isActive()) {
            return;
        }

        room.updateUnread(isMentioned);
    });

    ru = {
        events: events,
        client: rc,
        lobby: lobby,
        
        getRoomElements: getRoomElements,
        getCurrentRoomElements: getCurrentRoomElements,
        getNextRoomListElement: getNextRoomListElement,

        openRoom: openRoom,
        openRoomFromHash: function() {
            $.history.init(function(hash) {
                var roomName = rc.getRoomNameFromHash(hash);

                if (roomName) {
                    if (setActiveRoomCore(roomName) === false && roomName !== 'Lobby') {
                        openRoom(roomName);
                    }
                }
            })
        },
        
        getRoomCache: function() {
            return roomCache;
        },
        
        getActiveRoomPreference: function (name) {
            var room = getCurrentRoomElements();
            return rc.getRoomPreference(room.getName(), name);
        },

        setActiveRoom: function(roomName) {
            var hash = (document.location.hash || '#').substr(1),
                hashRoomName = rc.getRoomNameFromHash(hash);

            if (hashRoomName && hashRoomName === roomName) {
                setActiveRoomCore(roomName);
            } else {
                document.location.hash = '#/rooms/' + roomName;
            }
        },
        setActiveRoomCore: setActiveRoomCore,

        addRoom: addRoom,
        addRooms: function(rooms) {
            $.each(rooms, function(index, room) {
                addRoom(room);

                /*if (room.Private) {
                ui.setRoomLocked(room.Name);
            }
            if (room.Closed) {
                ui.setRoomClosed(room.Name);
            }*/
            });
        },
        
        scrollToBottom: scrollToBottom,

        bind: function(eventType, handler) {
            $this.bind(eventType, handler);
        },
    }

    users.initialize(ru);
    lobby.initialize(ru);
    messages.initialize(ru);

    return ru;
});