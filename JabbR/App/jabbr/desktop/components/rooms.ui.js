/*global define, document, setInterval*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.ui',
    'jabbr/core/state',
    'jabbr/core/events',
    'jabbr/core/templates',
    'jabbr/core/viewmodels/room',
    'jabbr/core/viewmodels/message',
    
    'jabbr/desktop/components/notifications',
    'jabbr/desktop/components/rooms.client',
    'jabbr/desktop/components/messages',
    'jabbr/desktop/components/lobby',
    
    'jabbr/core/components/users',
    'jabbr/core/contentproviders/core',
    'jabbr/core/messageprocessors/processor',
    
    'jquery-migrate',
    'jquery.history',
    'jquery.tmpl',
    'jquery.sortElements',
    'quicksilver'
], function ($, Logger, kernel, RoomsUI,
    // Core
    state, events, templates,
    
    // View Models
    Room, Message,
    
    // Components
    DesktopNotifications, rc, DesktopMessages, DesktopLobby,
    users, contentProviders, processor
) {
    var logger = new Logger('jabbr/desktop/components/rooms.ui'),
        notifications = null,
        lobby = null,
        messages = null,
        $this = $(this),
        $document = $(document),
        $chatArea = $('#chat-area'),
        $tabs = $('#tabs'),
        $topicBar = $('#topic-bar'),
        $roomActions = $('#room-actions'),
        $toast = $('#room-preferences .toast'),
        $sound = $('#room-preferences .sound'),
        $richness = $('#room-preferences .richness'),
        $notify = $('#room-actions .notify'),
        $kickedPopup = $('#jabbr-kicked'),
        $loadingHistoryIndicator = $('#loadingRoomHistory'),
        scrollTopThreshold = 75,
        lobbyLoaded = false;

    return RoomsUI.extend({
        constructor: function () {
            this.base();

            rc = rc();
            users = users();
            contentProviders = contentProviders();
            processor = processor();
            
            this.submodules = {
                notifications: new DesktopNotifications(),
                rc: rc,
                messages: new DesktopMessages(),
                lobby: new DesktopLobby(),
                
                users: users,
                contentProviders: contentProviders,
                processor: processor
            };
        },

        activate: function () {
            this.base();

            notifications = kernel.get('jabbr/components/notifications');
            lobby = kernel.get('jabbr/components/lobby');
            messages = kernel.get('jabbr/components/messages');
            
            
            client.chat.client.changeTopic = this.updateRoomTopic;

            // Bind events
            rc.bind(events.rooms.client.scrollToBottom, $.proxy(this._rcScrollToBottom, this));
            rc.bind(events.rooms.client.createMessage, $.proxy(this._rcCreateMessage, this));

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

            this.attach();
        },
        
        attach: function () {
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
        },
        
        // #region Implement RoomsUI

        // #region Room Elements

        getCurrentRoomElements: function () {
            var currentRoom = $tabs.find('li.current');

            if(currentRoom.length > 0) {
                return rc.getRoom(currentRoom.data('name'));
            }
            return null;
        },

        getAllRoomElements: function () {
            var _this = this,
                rooms = [];
            $("ul#tabs > li.room").each(function () {
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
                    updateRoom(roomViewModel.Name);
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

            scrollHandler = this._createScrollHandler(roomName, roomId, $messages);

            // Hookup the scroll handler since event delegation doesn't work with scroll events
            $messages.bind('scroll', scrollHandler);

            // Store the scroll handler so we can remove it later
            $messages.data('scrollHandler', scrollHandler);

            this.setAccessKeys();

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

            this.loadRoomPreferences(roomName);

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
        
        updateRoomTopic: function (roomName, topic) {
            var room = this.getRoomElements(roomName);

            if (room === null) {
                logger.warn('Room does not exist yet');
                return;
            }

            var topicHtml = topic === '' ?
                'You\'re chatting in ' + roomName :
                processor.processPlainContent(topic);
            var roomTopic = room.roomTopic;
            var isVisibleRoom = this.getCurrentRoomElements().getName() === roomName;

            if (isVisibleRoom) {
                roomTopic.hide();
            }

            roomTopic.html(topicHtml);

            if (isVisibleRoom) {
                roomTopic.fadeIn(2000);
            }
        },

        // #endregion

        _createScrollHandler: function (roomName, roomId, $messages) {
            var _this = this;

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
                if ($(this).scrollTop() <= scrollTopThreshold && !_this.isNearTheEnd(roomId)) {
                    var $child = $messages.children('.message:first');
                    if ($child.length > 0) {
                        messageId = $child.attr('id').substr(2); // Remove the "m-"

                        rc.scrollRoomTop({ name: roomName, messageId: messageId });
                    }
                }
            };
        },
        
        setAccessKeys: function () {
            $.each($tabs.find('li.room'), function (index, item) {
                if (index < 10) {
                    $(item).attr('accesskey', ((index + 1) % 10).toString());
                } else {
                    $(item).attr('accesskey', null);
                }
            });
        },

        // TODO: this could be moved to base
        _rcScrollToBottom: function (event, roomName) {
            this.scrollToBottom(roomName);
        },

        // TODO: this could be moved to base
        _rcCreateMessage: function (event, data, room) {
            var viewModel = new Message(data);

            rc.addMessage(viewModel.id);
            messages.addChatMessage(viewModel, room);
        },

        setLoadingHistory: function (loadingHistory) {
            if (loadingHistory) {
                var room = getCurrentRoomElements();
                $loadingHistoryIndicator.appendTo(room.messages);
                $loadingHistoryIndicator.fadeIn('slow');
            } else {
                $loadingHistoryIndicator.hide();
            }
        },
        
        // #region Preferences

        loadRoomPreferences: function (roomName) {
            // Set defaults
            if (state.getRoomPreference(roomName, 'hasSound') === undefined) {
                state.setRoomPreference(roomName, 'hasSound', true);
            }

            // Placeholder for room level preferences
            this.toggleElement($sound, 'hasSound', roomName);
            this.toggleElement($toast, 'canToast', roomName);
            this.toggleRichness($richness, roomName);
            this.toggleNotify($notify, roomName);
        },

        toggleRichness: function ($element, roomName) {
            var blockRichness = roomName ?
                state.getRoomPreference(roomName, 'blockRichness') :
                state.get().preferences.blockRichness;

            if (blockRichness === true) {
                $element.addClass('off');
            } else {
                $element.removeClass('off');
            }
        },

        toggleNotify: function ($element, roomName) {
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
        },

        toggleElement: function ($element, preferenceName, roomName) {
            var value = roomName ?
                state.getRoomPreference(roomName, preferenceName) :
                this.get().preferences[preferenceName];

            if (value === true) {
                $element.removeClass('off');
            } else {
                $element.addClass('off');
            }
        },

        // #endregion
        
        showKickPopup: function (roomName, message, imageUrl) {
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
        },

        showGravatarProfile: function (profile) {
            var room = this.getCurrentRoomElements(),
                nearEnd = this.isNearTheEnd();

            messages.appendMessage(templates.gravatarprofile.tmpl(profile), room);
            if (nearEnd) {
                this.scrollToBottom();
            }
        },
    });
});