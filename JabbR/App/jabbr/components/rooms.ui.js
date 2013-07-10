/*global define, document*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/events',
    'jabbr/templates',
    'jabbr/viewmodels/room',
    'jabbr/viewmodels/message',
    'jabbr/components/rooms.client',
    'jabbr/components/users',
    'jabbr/components/lobby',
    'jabbr/components/messages',
    'jabbr/components/notifications',
    'jabbr/messageprocessors/processor',
    'jquery-migrate',
    'jquery.history',
    'jquery.tmpl',
    'jquery.sortElements',
    'quicksilver'
], function ($, Logger, kernel,
    // Core
    state, events, templates,
    // View Models
    Room, Message,
    // Components
    rc, users, lobby, messages, notifications, processor
) {
    var logger = new Logger('jabbr/components/rooms.ui'),
        client = null,
        ui = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
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
            rooms = {},
            scrollTopThreshold = 75,
            lobbyLoaded = false;

        //
        // Private Functions
        //

        // Elements

        function getRoom(roomName) {
            if (!hasRoom(roomName)) {
                return null;
            }
            if (!validRoom(roomName)) {
                if (!updateRoom(roomName)) {
                    return null;
                }
            }
            return rooms[roomName];
        }

        function hasRoom(roomName) {
            return roomName in rooms;
        }

        function validRoom(roomName) {
            return rooms[roomName].exists();
        }

        function updateRoom(roomName) {
            var roomId = rc.getRoomId(roomName);

            logger.trace("Updating current room elements");

            // Update the current elements if the room has already been added
            rooms[roomName].tab = $('#tabs-' + roomId);
            rooms[roomName].users = $('#userlist-' + roomId);
            rooms[roomName].owners = $('#userlist-' + roomId + '-owners');
            rooms[roomName].activeUsers = $('#userlist-' + roomId + '-active');
            rooms[roomName].messages = $('#messages-' + roomId);
            rooms[roomName].roomTopic = $('#roomTopic-' + roomId);

            if (!validRoom(roomName)) {
                logger.warn('Failed to update invalid room "' + roomName + '"');
                return false;
            }

            return true;
        }

        function createRoom(roomName) {
            if (!hasRoom(roomName)) {
                logger.trace("Creating room '" + roomName + "'");
                var roomId = rc.getRoomId(roomName);
                rooms[roomName] = new Room(
                    $('#tabs-' + roomId),
                    $('#userlist-' + roomId),
                    $('#userlist-' + roomId + '-owners'),
                    $('#userlist-' + roomId + '-active'),
                    $('#messages-' + roomId),
                    $('#roomTopic-' + roomId)
                );

                if (validRoom(roomName)) {
                    return rooms[roomName];
                } else {
                    logger.warn('Failed to create room "' + roomName + '"');
                    return null;
                }
            }

            return getRoom(roomName);
        }

        // Deprecated - TODO: Remove
        function getRoomElements(roomName) {
            return getRoom(roomName);
        }

        function getCurrentRoomElements() {
            return getRoom($tabs.find('li.current').data('name'));
        }

        function getAllRoomElements() {
            var rooms = [];
            $("ul#tabs > li.room").each(function () {
                rooms[rooms.length] = getRoomElements($(this).data("name"));
            });
            return rooms;
        }

        function getNextRoomListElement($targetList, roomName, count, closed) {
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
        }

        function isNearTheEnd(roomName) {
            var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

            return room.isNearTheEnd();
        }

        function isSelf(user) {
            return client.chat.state.name === user.Name;
        }

        function setInitialized(roomName) {
            var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();
            room.setInitialized();
        }

        function setRoomTrimmable(roomName, canTrimMessages) {
            var room = getRoomElements(roomName);
            room.setTrimmable(canTrimMessages);
        }

        function updateRoomTopic(roomdata) {
            var room = getRoomElements(roomdata.Name);
            var topic = roomdata.Topic;
            var topicHtml = topic === '' ?
                'You\'re chatting in ' + roomdata.Name :
                processor.processPlainContent(topic);
            var roomTopic = room.roomTopic;
            var isVisibleRoom = getCurrentRoomElements().getName() === roomdata.Name;

            if (isVisibleRoom) {
                roomTopic.hide();
            }

            roomTopic.html(topicHtml);

            if (isVisibleRoom) {
                roomTopic.fadeIn(2000);
            }
        }

        // Preferences

        function loadRoomPreferences(roomName) {
            //var roomPreferences = state.getRoomPreference(roomName);

            // Set defaults
            if (state.getRoomPreference(roomName, 'hasSound') === undefined) {
                state.setRoomPreference(roomName, 'hasSound', true);
            }

            // Placeholder for room level preferences
            toggleElement($sound, 'hasSound', roomName);
            toggleElement($toast, 'canToast', roomName);
            toggleRichness($richness, roomName);
            toggleNotify($notify, roomName);
        }

        function toggleRichness($element, roomName) {
            var blockRichness = roomName ?
                state.getRoomPreference(roomName, 'blockRichness') :
                state.get().preferences.blockRichness;

            if (blockRichness === true) {
                $element.addClass('off');
            } else {
                $element.removeClass('off');
            }
        }

        function toggleNotify($element, roomName) {
            var notifyState = state.getRoomPreference(roomName, 'notify') || 'mentions';

            if (notifyState === 'all' && $element.hasClass('notify-mentions')) {
                $element.removeClass('notify-mentions');
                $element.addClass('notify-all');
                $('.notify-text', $element).text('All');
            } else if (notifyState === 'mentions' && $element.hasClass('notify-all')) {
                $element.removeClass('notify-all');
                $element.addClass('notify-mentions');
                $('.notify-text', $element).text('Mentions');
            }
        }

        function toggleElement($element, preferenceName, roomName) {
            var value = roomName ?
                state.getRoomPreference(roomName, preferenceName) :
                this.get().preferences[preferenceName];

            if (value === true) {
                $element.removeClass('off');
            } else {
                $element.addClass('off');
            }
        }

        // Room Navigation/Loading

        function activateOrOpenRoom(roomName) {
            logger.trace('activateOrOpenRoom(' + roomName + ')');

            if (hasRoom(roomName)) {
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

            if (room !== null && room.exists()) {
                if (currentRoom !== null && currentRoom.exists()) {
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
            var room = getRoom(roomName),
                scrollHandler = null;

            if (room !== null) {
                // Remove the scroll handler from this room
                scrollHandler = room.messages.data('scrollHandler');
                room.messages.unbind('scrollHandler', scrollHandler);

                room.tab.remove();
                room.messages.remove();
                room.users.remove();
                room.roomTopic.remove();
                setAccessKeys();
            }

            if (hasRoom(roomName)) {
                logger.trace('Deleting room "' + roomName + '"');

                users.removeRoomUsers(roomName);

                delete rooms[roomName];
            }
        }

        function setAccessKeys() {
            $.each($tabs.find('li.room'), function (index, item) {
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

            if (hasRoom(roomViewModel.Name)) {
                if (!validRoom(roomViewModel.Name)) {
                    updateRoom(roomViewModel.Name);
                }
                return false;
            }

            var room = createRoom(roomViewModel.Name),
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
                .sortElements(function (a, b) {
                    return $(a).data('name').toString().toUpperCase() > $(b).data('name').toString().toUpperCase() ? 1 : -1;
                });

            scrollHandler = function () {
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

        // Room Client

        function rcScrollToBottom(event, roomName) {
            scrollToBottom(roomName);
        }

        function rcCreateMessage(event, data, room) {
            var viewModel = new Message(data);

            rc.addMessage(viewModel.id);
            messages.addChatMessage(viewModel, room);
        }

        // Hub

        // When the /join command gets raised this is called
        function chatJoinRoom(roomdata) {
            var added = addRoom(roomdata),
                roomName = roomdata.Name,
                room = getRoom(roomName);

            setActiveRoom(roomName);

            if (roomdata.Private) {
                room.setLocked(true);
            }
            if (roomdata.Closed) {
                room.setClosed(true);
            }

            if (added) {
                rc.populateRoom(roomdata.Name).done(function () {
                    messages.addMessage('You just entered ' + roomdata.Name, 'notification', roomdata.Name);

                    if (roomdata.Welcome) {
                        messages.addMessage(roomdata.Welcome, 'welcome', roomdata.Name);
                    }
                });
            }
        }

        function chatLeave(user, room) {
            if (isSelf(user)) {
                setActiveRoom('Lobby');
                removeRoom(room);
            } else {
                users.remove(user, room);
                messages.addMessage(user.Name + ' left ' + room, 'notification', room);
            }
        }

        function chatLockRoom(user, roomName) {
            if (!isSelf(user) && state.get().activeRoom === room) {
                messages.addMessage(user.Name + ' has locked ' + room + '.', 'notification', state.get().activeRoom);
            }

            var room = getRoom(roomName);

            if (room !== null) {
                room.setLocked(true);
                lobby.lockRoom(roomName);
            }
        }

        function chatRoomClosed(roomName) {
            messages.addMessage('Room \'' + roomName + '\' is now closed', 'notification', state.get().activeRoom);

            var room = getRoom(roomName);

            if (room !== null) {
                room.setClosed(true);

                if (state.get().activeRoom === roomName) {
                    ui.toggleMessageSection(true);
                }
            }
        }

        function chatRoomUnClosed(roomName) {
            messages.addMessage('Room \'' + roomName + '\' is now open', 'notification', state.get().activeRoom);

            var room = getRoom(roomName);

            if (room !== null) {
                room.setClosed(false);

                if (state.get().activeRoom === roomName) {
                    ui.toggleMessageSection(false);
                }
            }
        }

        // Global Events

        events.bind(events.error, function (event, content, type) {
            messages.addMessage(content, type);
        });

        events.bind(events.rooms.ui.updateUnread, function (event, roomName, isMentioned) {
            logger.trace("updateUnread(" + roomName + ", " + isMentioned + ")");
            var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

            if (ui.isFocused() && room.isActive()) {
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

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');

                client.activate();
                rc.activate();
                users.activate();
                lobby.activate();
                messages.activate();
                notifications.activate();
                processor.activate();

                logger.trace('activated');

                // Bind events
                rc.bind(events.rooms.client.scrollToBottom, rcScrollToBottom);
                rc.bind(events.rooms.client.createMessage, rcCreateMessage);

                client.chat.client.joinRoom = chatJoinRoom;
                client.chat.client.leave = chatLeave;
                client.chat.client.changeTopic = updateRoomTopic;

                client.chat.client.lockRoom = chatLockRoom;
                client.chat.client.roomClosed = chatRoomClosed;
                client.chat.client.roomUnClosed = chatRoomUnClosed;
            },

            createRoom: createRoom,

            getRoomElements: getRoomElements,
            getCurrentRoomElements: getCurrentRoomElements,
            getAllRoomElements: getAllRoomElements,
            getNextRoomListElement: getNextRoomListElement,

            openRoomFromHash: function () {
                $.history.init(function (hash) {
                    var roomName = rc.getRoomNameFromHash(hash);

                    if (roomName) {
                        if (setActiveRoomCore(roomName) === false && roomName !== 'Lobby') {
                            rc.joinRoom(roomName);
                        }
                    }
                });
            },

            getRoomCache: function () {
                return roomCache;
            },

            getActiveRoomPreference: function (name) {
                var room = getCurrentRoomElements();
                return state.getRoomPreference(room.getName(), name);
            },

            isSelf: isSelf,
            setInitialized: setInitialized,
            setRoomTrimmable: setRoomTrimmable,
            updateRoomTopic: updateRoomTopic,

            setActiveRoom: setActiveRoom,
            setActiveRoomCore: setActiveRoomCore,

            addRoom: addRoom,
            addRooms: function (rooms) {
                $.each(rooms, function (index, roomdata) {
                    addRoom(roomdata);
                    var room = getRoom(roomdata.Name);

                    if (roomdata.Private) {
                        room.setLocked(true);
                    }
                    if (roomdata.Closed) {
                        room.setClosed(true);
                    }
                });
            },

            scrollToBottom: scrollToBottom,

            scrollIfNecessary: function (callback, room) {
                var nearEnd = isNearTheEnd(room);

                callback();

                if (nearEnd) {
                    this.scrollToBottom(room);
                }
            },

            bind: function (eventType, handler) {
                $this.bind(eventType, handler);
            }
        };
    };

    return function () {
        if (object === null) {
            // initialize sub-modules
            rc = rc();
            users = users();
            lobby = lobby();
            messages = messages();
            notifications = notifications();
            processor = processor();

            object = initialize();
            kernel.bind('jabbr/components/rooms.ui', object);
        }

        return object;
    };
});