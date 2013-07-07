define([
    'logger',
    'jabbr/client',
    'jabbr/state',
    'jabbr/events',
    'jabbr/templates',
    'jabbr/messageprocessors/processor',
    'jabbr/viewmodels/room',
    'jabbr/viewmodels/message',
    'jabbr/components/rooms.client',
    'jabbr/components/users',
    'jabbr/components/lobby',
    'jabbr/components/messages',
    'jabbr/components/notifications',
    
    'jquery-migrate',
    'jquery.history',
    'jquery.tmpl',
    'jquery.sortElements',
    'quicksilver'
], function (Logger,
    // Core
    client, state, events, templates, processor,
    
    // View Models
    Room, Message,
    
    // Components
    rc, users, lobby, messages, notifications
) {
    var logger = new Logger('jabbr/components/rooms.ui');
    logger.trace('loaded');

    var ru = {};

    //var events = {
    //    activateRoom: 'jabbr.components.rooms.ui.activateRoom',
    //    focus: 'jabbr.components.rooms.ui.focus',
    //};

    var $document = $(document),
        $toast = $('#room-preferences .toast'),
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

    function isNearTheEnd(roomName) {
        var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

        return room.isNearTheEnd();
    }

    function isSelf(user) {
        return client.chat.state.name === user.Name;
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

    function activateOrOpenRoom(roomName) {
        logger.trace('activateOrOpenRoom(' + roomName + ')')
        var room = getRoomElements(roomName);
        
        if (room.exists()) {
            setActiveRoom(roomName);
        } else {
            rc.joinRoom(roomName);
        }
    }

    function setActiveRoom(roomName) {
        logger.trace('setActiveRoom(' + roomName + ')');

        var hash = (document.location.hash || '#').substr(1),
            hashRoomName = rc.getRoomNameFromHash(hash);

        if (hashRoomName && hashRoomName === roomName) {
            setActiveRoomCore(roomName);
        } else {
            document.location.hash = '#/rooms/' + roomName;
        }
    }

    function setActiveRoomCore(roomName) {
        var room = getRoomElements(roomName);

        loadRoomPreferences(roomName);

        if (room.isActive()) {
            // Still trigger the event (just do less overall work)
            rc.activeRoomChanged(roomName);
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

            $this.trigger(events.rooms.ui.activateRoom, room);

            rc.activeRoomChanged(roomName);
            events.trigger(events.focused, room);

            return true;
        }

        return false;
    }

    function removeRoom(roomName) {
        var room = getRoomElements(roomName),
            scrollHandler = null;

        if (room.exists()) {
            // Remove the scroll handler from this room
            scrollHandler = room.messages.data('scrollHandler');
            room.messages.unbind('scrollHandler', scrollHandler);

            room.tab.remove();
            room.messages.remove();
            room.users.remove();
            room.roomTopic.remove();
            setAccessKeys();
        }
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
        logger.trace("addRoom(" + roomName + ")");

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
            if ($(this).scrollTop() <= scrollTopThreshold && !isNearTheEnd(roomId)) {
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
        var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

        if (room.isActive()) {
            room.scrollToBottom();
        }
    }

    //
    // Event Handlers
    //
    
    // Hub
    
    // When the /join command gets raised this is called
    client.chat.client.joinRoom = function (room) {
        var added = addRoom(room);

        setActiveRoom(room.Name);

        /*if (room.Private) {
            ui.setRoomLocked(room.Name);
        }
        if (room.Closed) {
            ui.setRoomClosed(room.Name);
        }*/

        if (added) {
            rc.populateRoom(room.Name).done(function () {
                messages.addMessage('You just entered ' + room.Name, 'notification', room.Name);

                if (room.Welcome) {
                    messages.addMessage(room.Welcome, 'welcome', room.Name);
                }
            });
        }
    };
    
    client.chat.client.leave = function (user, room) {
        if (isSelf(user)) {
            setActiveRoom('Lobby');
            removeRoom(room);
        }
        else {
            users.remove(user, room);
            messages.addMessage(user.Name + ' left ' + room, 'notification', room);
        }
    };

    // Room Client

    rc.bind(events.rooms.client.scrollToBottom, function (event, roomName) {
        scrollToBottom(roomName);
    });

    rc.bind(events.rooms.client.createMessage, function (event, data, room) {
        var viewModel = new Message(ru, data);

        rc.addMessage(viewModel.id);
        messages.addChatMessage(viewModel, room);
    });

    events.bind(events.error, function(event, content, type) {
        messages.addMessage(content, type);
    });

    // Client

    events.bind(events.rooms.ui.updateUnread, function (event, roomName, isMentioned) {
        console.log(event);
        logger.trace("updateUnread(" + roomName + ", " + isMentioned + ")");
        var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

        if (focus && room.isActive()) {
            return;
        }

        room.updateUnread(isMentioned);
    });
    
    // DOM
    
    $document.on('click', 'li.room .room-row', function () {
        var roomName = $(this).parent().data('name');
        activateOrOpenRoom(roomName);
    });

    $document.on('click', '#tabs li', function () {
        var roomName = $(this).data('name');
        activateOrOpenRoom(roomName);
    });
    
    $document.on('mousedown', '#tabs li.room', function (ev) {
        // if middle mouse
        if (ev.which === 2) {
            rc.leaveRoom($(this).data('name'));
        }
    });
    
    $document.on('click', '#tabs li .close', function (ev) {
        var roomName = $(this).closest('li').data('name');

        rc.leaveRoom(roomName);

        ev.preventDefault();
        return false;
    });

    ru = {
        client: rc,
        messages: messages,
        lobby: lobby,
        
        getRoomElements: getRoomElements,
        getCurrentRoomElements: getCurrentRoomElements,
        getNextRoomListElement: getNextRoomListElement,

        openRoomFromHash: function() {
            $.history.init(function(hash) {
                var roomName = rc.getRoomNameFromHash(hash);

                if (roomName) {
                    if (setActiveRoomCore(roomName) === false && roomName !== 'Lobby') {
                        rc.joinRoom(roomName);
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

        setActiveRoom: setActiveRoom,
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
        
        scrollIfNecessary: function(callback, room) {
            var nearEnd = isNearTheEnd(room);

            callback();

            if (nearEnd) {
                this.scrollToBottom(room);
            }
        },

        bind: function(eventType, handler) {
            $this.bind(eventType, handler);
        },
    }

    users.initialize(ru);
    lobby.initialize(ru);
    messages.initialize(ru);
    processor.initialize(ru);
    notifications.initialize(ru);

    return ru;
});