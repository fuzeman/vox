/*global define, document, setInterval*/
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
            $topicBar = $('#topic-bar'),
            $kickedPopup = $('#jabbr-kicked'),
            $loadingHistoryIndicator = $('#loadingRoomHistory'),
            $this = $(this),
            scrollTopThreshold = 75,
            trimRoomHistoryFrequency = 1000 * 60 * 2, // 2 minutes in ms
            lobbyLoaded = false;

        // #region Room Elements

        function updateRoom(roomName) {
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
        }

        function createRoom(roomName) {
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
        }

        // Deprecated - TODO: Remove
        function getRoomElements(roomName) {
            return rc.getRoom(roomName);
        }

        function getCurrentRoomElements() {
            var currentRoom = $tabs.find('li.current');

            if(currentRoom.length > 0) {
                return rc.getRoom(currentRoom.data('name'));
            }
            return null;
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

        function updateRoomTopic(roomName, topic) {
            var room = getRoomElements(roomName);

            if (room === null) {
                logger.warn('Room does not exist yet');
                return;
            }

            var topicHtml = topic === '' ?
                'You\'re chatting in ' + roomName :
                processor.processPlainContent(topic);
            var roomTopic = room.roomTopic;
            var isVisibleRoom = getCurrentRoomElements().getName() === roomName;

            if (isVisibleRoom) {
                roomTopic.hide();
            }

            roomTopic.html(topicHtml);

            if (isVisibleRoom) {
                roomTopic.fadeIn(2000);
            }
        }

        // #endregion

        // #region Preferences

        function loadRoomPreferences(roomName) {
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

        // #endregion

        // #region Room Navigation/Loading

        function setActiveRoomCore(roomName) {
            var room = getRoomElements(roomName);

            loadRoomPreferences(roomName);

            if (room === null) {
                return false;
            }

            if (room.isActive()) {
                // Still trigger the event (just do less overall work)
                rc.activeRoomChanged(roomName);
                return true;
            }

            var currentRoom = getCurrentRoomElements();

            if (room.exists()) {
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

        function setAccessKeys() {
            $.each($tabs.find('li.room'), function (index, item) {
                if (index < 10) {
                    $(item).attr('accesskey', ((index + 1) % 10).toString());
                } else {
                    $(item).attr('accesskey', null);
                }
            });
        }

        function createScrollHandler(roomName, roomId, $messages) {
            return function (ev) {
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
                        messageId = $child.attr('id').substr(2); // Remove the "m-"

                        rc.scrollRoomTop({ name: roomName, messageId: messageId });
                    }
                }
            };
        }

        function addRoom(roomViewModel) {
            // Do nothing if the room exists
            var roomName = roomViewModel.Name;
            logger.trace("addRoom(" + roomName + ")");

            if (rc.hasRoom(roomViewModel.Name)) {
                if (!rc.validRoom(roomViewModel.Name)) {
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

            if (!rc.inRoomCache(roomName)) {
                lobby.addRoom(roomViewModel);
            }

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
                    return rc.cleanRoomName($(a).data('name')) > rc.cleanRoomName($(b).data('name')) ? 1 : -1;
                });

            scrollHandler = createScrollHandler(roomName, roomId, $messages);

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

        // #endregion

        function rcScrollToBottom(event, roomName) {
            scrollToBottom(roomName);
        }

        function rcCreateMessage(event, data, room) {
            var viewModel = new Message(data);

            rc.addMessage(viewModel.id);
            messages.addChatMessage(viewModel, room);
        }

        function showKickPopup(roomName, message, imageUrl) {
            if (message !== null) {
                $('.kick-message', $kickedPopup).text(message);
            } else {
                $('.kick-message', $kickedPopup).text('Kicked from #' + roomName);
            }

            if (imageUrl !== null) {
                $('.kick-image', $kickedPopup).css('background-image', 'url("' + imageUrl + '")');
                $('.kick-image', $kickedPopup).show();
            } else {
                $('.kick-image', $kickedPopup).css('background-image', '');
                $('.kick-image', $kickedPopup).hide();
            }
            $kickedPopup.modal();
        }

        function showGravatarProfile(profile) {
            var room = getCurrentRoomElements(),
                nearEnd = isNearTheEnd();

            messages.appendMessage(templates.gravatarprofile.tmpl(profile), room);
            if (nearEnd) {
                scrollToBottom();
            }
        }

        function setLoadingHistory(loadingHistory) {
            if (loadingHistory) {
                var room = getCurrentRoomElements();
                $loadingHistoryIndicator.appendTo(room.messages);
                $loadingHistoryIndicator.fadeIn('slow');
            } else {
                $loadingHistoryIndicator.hide();
            }
        }

        function trimRoomMessageHistory(roomName) {
            var rooms = roomName ? [rc.getRoomElements(roomName)] : getAllRoomElements();

            for (var i = 0; i < rooms.length; i++) {
                rooms[i].trimHistory();
            }
        }

        // #region Global Events

        // TODO - Replace with DI object call
        events.bind(events.error, function (event, exception, type) {
            messages.addMessage(exception.message, type);
        });

        // TODO - Replace with DI object call
        events.bind(events.rooms.ui.updateUnread, function (event, roomName, isMentioned) {
            logger.trace("updateUnread(" + roomName + ", " + isMentioned + ")");
            var room = roomName ? getRoomElements(roomName) : getCurrentRoomElements();

            if (ui.isFocused() && room.isActive()) {
                return;
            }

            room.updateUnread(isMentioned);
        });

        // #endregion

        // #region DOM

        $document.on('click', 'li.room .room-row', function () {
            var roomName = $(this).parent().data('name');
            rc.activateOrOpenRoom(roomName);
        });

        $document.on('click', '#tabs li', function () {
            var roomName = $(this).data('name');
            rc.activateOrOpenRoom(roomName);
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

        // #endregion

        setInterval(function () {
            trimRoomMessageHistory();
        }, trimRoomHistoryFrequency);

        // Hub Handlers
        var handlers = {
            bind: function () {
                client.chat.client.joinRoom = this.joinRoom;

                client.chat.client.kick = this.kick;
            },

            joinRoom: function (roomdata) {
                var added = addRoom(roomdata),
                    roomName = roomdata.Name,
                    room = rc.getRoom(roomName);

                rc.setActiveRoom(roomName);

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
            },

            kick: function (userdata, roomName, message, imageUrl) {
                if (rc.isSelf(userdata)) {
                    showKickPopup(roomName, message, imageUrl);
                    rc.setActiveRoom('Lobby');
                    rc.removeRoom(roomName);
                    // TODO Where does this message go?
                    messages.addMessage('You were kicked from ' + roomName, 'notification');
                } else {
                    users.remove(userdata, roomName);
                    var roomMessage = userdata.Name + ' was kicked from ' + roomName;

                    if (message !== null && imageUrl !== null) {
                        roomMessage += ' (' + [message, '<a href="' + imageUrl +
                            '">' + imageUrl + '</a>'].join(' - ') + ')';
                    } else if (message !== null) {
                        roomMessage += ' (' + message + ')';
                    } else if (imageUrl !== null) {
                        roomMessage += ' (<a href="' + imageUrl + '">' + imageUrl + '</a>)';
                    }

                    messages.addMessage({ content: roomMessage, encoded: true }, 'notification', roomName);
                }
            }
        };

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

                client.chat.client.changeTopic = updateRoomTopic;

                handlers.bind();
            },

            // #region Room Elements

            createRoom: createRoom,
            updateRoom: updateRoom,

            getRoomElements: getRoomElements,
            getCurrentRoomElements: getCurrentRoomElements,
            getAllRoomElements: getAllRoomElements,
            getNextRoomListElement: getNextRoomListElement,

            // #endregion

            getActiveRoomPreference: function (name) {
                var room = getCurrentRoomElements();
                return state.getRoomPreference(room.getName(), name);
            },

            updateRoomTopic: updateRoomTopic,

            // #region Room Navigation/Loading
            addRoom: addRoom,
            addRooms: function (rooms) {
                $.each(rooms, function (index, roomdata) {
                    addRoom(roomdata);
                    var room = rc.getRoom(roomdata.Name);

                    if (roomdata.Private) {
                        room.setLocked(true);
                    }
                    if (roomdata.Closed) {
                        room.setClosed(true);
                    }
                });
            },
            setActiveRoomCore: setActiveRoomCore,
            // #endregion

            isNearTheEnd: isNearTheEnd,
            scrollToBottom: scrollToBottom,
            scrollIfNecessary: function (callback, room) {
                var nearEnd = isNearTheEnd(room);

                callback();

                if (nearEnd) {
                    this.scrollToBottom(room);
                }
            },

            setAccessKeys: setAccessKeys,

            showGravatarProfile: showGravatarProfile,
            setLoadingHistory: setLoadingHistory,

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