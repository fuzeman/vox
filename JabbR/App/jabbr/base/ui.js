/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/events',
    'jabbr/core/state'
], function ($, Logger, kernel, EventObject, events, state) {
    var logger = new Logger('jabbr/ui'),
        client = null,
        rc = null,
        ru = null,
        lobby = null,
        help = null,
        messages = null;

    logger.trace('loaded');

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.readOnly = false;
            this.focus = true;

            this.originalTitle = document.title;

            this.unread = 0;
            this.isUnreadMessageForUser = false;

            this.checkingStatus = false;
            this.typing = false;

            this.currentMessageCount = null;
            this.nextMessageCountUpdateAt = null;
            this.messagesReceivedSince = 0;

            this.setReadOnly(false); // TODO: is this actually needed?

            this.submodules = {};
            kernel.bind('jabbr/ui', this);
        },

        activate: function () {
            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            lobby = kernel.get('jabbr/components/lobby');
            help = kernel.get('jabbr/components/help');
            messages = kernel.get('jabbr/components/messages');

            // activate submodules
            $.each(this.submodules, function (i, module) {
                module.activate();
            });

            logger.trace('activated');

            // Bind application events

            ru.bind(events.rooms.ui.activateRoom, $.proxy(this._activateRoom, this));

            client.bind(events.client.connected, $.proxy(this._clientConnected, this));
            client.bind(events.client.disconnected, $.proxy(this._clientDisconneted, this));
            client.bind(events.client.loggedOn, $.proxy(this._clientLoggedOn, this));

            events.bind(events.ui.clearUnread, $.proxy(this.clearUnread, this));
            events.bind(events.ui.updateUnread, $.proxy(this.updateUnread, this));
            events.bind(events.ui.updateTitle, $.proxy(this.updateTitle, this));

            //handlers.bind();

            // Bind DOM events

            $(window).blur($.proxy(this._windowBlur, this))
                     .focus($.proxy(this._windowFocus, this))
                     .resize($.proxy(this._windowResize, this))
                     .keypress($.proxy(this._windowKeyPress, this))
                     .keydown($.proxy(this._windowKeyDown, this));

            // Bind hub events

            client.chat.client.nudge = $.proxy(this.nudge, this);
            client.chat.client.mentionsChanged = $.proxy(this.mentionsChanged, this);

            client.chat.client.forceUpdate = $.proxy(this.showUpdatePopup, this);
            client.chat.client.outOfSync = $.proxy(this.showUpdatePopup, this);
        },

        //
        // Event Handlers
        //

        _activateRoom: function (event, activateRoom) {
            this.toggleMessageSection(activateRoom.isClosed());
        },

        _clientConnected: function (event, change, initial) {
            if (!initial) {
                this.setReadOnly(false);
            }
        },

        _clientDisconneted: function () {
            this.setReadOnly(true);
        },

        _clientLoggedOn: function (event, currentRooms, ownedRooms, preferences, mentions, unreadNotifications) {
            var _this = this;

            ru.addRooms(currentRooms);

            // Process any urls that may contain room names
            rc.openRoomFromHash();

            // Otherwise set the active room
            rc.setActiveRoom(state.get().activeRoom || 'Lobby');

            var loadRooms = function () {
                var filteredRooms = [];
                $.each(currentRooms, function (index, room) {
                    if (client.chat.state.activeRoom !== room.Name) {
                        filteredRooms.push(room.Name);
                    }
                });

                _this.populateRooms(filteredRooms);

                // Set current unread messages
                $.each(unreadNotifications, function (index, notification) {
                    messages.setMessageReadState(notification.MessageId, false);
                });
            };

            if (state.get().activeRoom) {
                // Always populate the active room first then load the other rooms so it looks fast :)
                rc.populateRoom(state.get().activeRoom).done(function () {
                    help.load();
                    lobby.updateRooms();
                    loadRooms();
                });
            } else {
                // Populate the lobby first then everything else
                lobby.updateRooms().done(function () {
                    help.load();
                    loadRooms();
                });
            }

            // Update server message count display
            this.updateMessageCount();
        },

        // Window Events

        _windowBlur: function () {
            this.focus = false;
            this.updateTitle();
        },

        _windowFocus: function () {
            // clear unread count in active room
            var room = ru.getCurrentRoomElements();
            room.makeActive();

            if (!this.focus) {
                this.triggerFocus();
            }
        },

        _windowResize: function () {
            var room = ru.getCurrentRoomElements();

            if (room !== null) {
                room.makeActive();
                room.scrollToBottom();
            }
        },

        _windowKeyFocus: function (ev) { logger.warn('_windowKeyFocus not implemented'); },

        //
        // Public Methods
        //

        // Message Count

        triggerSend: function (id, msg) {
            this.focus = true;

            if (msg) {
                if (id === undefined) {
                    messages.sendMessage(msg);
                } else {
                    messages.sendMessage({ content: msg, id: id });
                }
            }
            //TODO: updateNewMessageSize();
            this.resetSelection(id);

            // always scroll to bottom after new message sent
            var room = ru.getCurrentRoomElements();
            room.scrollToBottom();
            room.removeSeparator();
        },

        setMessageCount: function (count) { logger.warn('setMessageCount not implemented'); },

        incrementMessageCount: function () {
            this.updateMessageCount(1);
        },

        updateMessageCount: function (delta) {
            delta = delta !== undefined ? delta : 0;

            if (this.currentMessageCount === null || this.messagesReceivedSince > this.nextMessageCountUpdateAt) {
                client.chat.server.getMessageCount()
                    .done($.proxy(function (count) {
                        this.currentMessageCount = count;
                        this.messagesReceivedSince = delta;
                        this.nextMessageCountUpdateAt = Math.floor((Math.random() * 300) + 100);

                        this.setMessageCount(this.currentMessageCount + this.messagesReceivedSince);
                    }, this));
            } else {
                this.messagesReceivedSince += delta;
                this.setMessageCount(this.currentMessageCount + this.messagesReceivedSince);
            }
        },

        //

        nudge: function (from, to) { logger.warn('nudge not implemented'); },

        mentionsChanged: function (mentions, update) {
            if (mentions === null) {
                mentions = [];
            }

            client.updateMentions(mentions);

            var message = null;

            if (update) {
                if (mentions.length === 0) {
                    message = 'Your mention strings have been cleared';
                } else {
                    message = 'Your mention strings have been set to "' + mentions.join('", "') + '"';
                }
            } else {
                if (mentions.length === 0) {
                    message = 'You have no mention strings set';
                } else {
                    message = 'Your mention strings are "' + mentions.join('", "') + '"';
                }
            }

            messages.addMessage(message, 'notification', state.get().activeRoom);
        },

        triggerTyping: function () {
            // If not in a room, don't try to send typing notifications
            if (!client.chat.state.activeRoom) {
                return;
            }

            if (this.checkingStatus === false && this.typing === false) {
                this.typing = true;

                try {
                    rc.setRoomTrimmable(client.chat.state.activeRoom, this.typing);
                    client.chat.server.typing(client.chat.state.activeRoom);
                } catch (e) {
                    client.connection.hub.log('Failed to send via websockets');
                }

                window.setTimeout($.proxy(function () {
                    this.typing = false;
                }, this), 3000);
            }
        },

        clearUnread: function () {
            this.isUnreadMessageForUser = false;
            this.unread = 0;

            this.updateTitle();
        },

        updateUnread: function (event, room, isMentioned) {
            room = room !== undefined ? room : client.chat.state.activeRoom;
            isMentioned = isMentioned !== undefined ? isMentioned : false;

            if (this.focus === false) {
                this.isUnreadMessageForUser = (this.isUnreadMessageForUser || isMentioned);
                this.unread = this.unread + 1;
            } else {
                //we're currently focused so remove
                //the * notification
                this.isUnreadMessageForUser = false;
            }

            events.trigger(events.rooms.ui.updateUnread, [room, isMentioned]);

            this.updateTitle();
        },

        updateTitle: function () {
            // ugly hack via http://stackoverflow.com/a/2952386/188039
            setTimeout($.proxy(function () {
                if (this.unread === 0) {
                    document.title = this.originalTitle;
                } else {
                    document.title = (this.isUnreadMessageForUser ? '*' : '') +
                        '(' + this.unread + ') ' + this.originalTitle;
                }
            }, this), 200);
        },

        triggerFocus: function () {
            if (this.focus === false) {
                this.focus = true;
                client.focused();
            }
        },

        showUpdatePopup: function () { logger.warn('showUpdatePopup not implemented'); },

        //

        populateRooms: function (rooms) {
            client.connection.hub.log('loadRooms(' + rooms.join(', ') + ')');

            // Populate the list of users rooms and messages
            client.chat.server.loadRooms(rooms)
                .done(function () {
                    client.connection.hub.log('loadRooms.done(' + rooms.join(', ') + ')');
                })
                .fail(function (e) {
                    client.connection.hub.log('loadRooms.failed(' + rooms.join(', ') + ', ' + e + ')');
                });
        },

        setReadOnly: function (isReadOnly) { logger.warn('setReadOnly not implemented'); },

        toggleMessageSection: function (disabledIt) { logger.warn('toggleMessageSection not implemented'); },

        setMessage: function (clientMessage) { logger.warn('setMessage not implemented'); },

        resetSelection: function (id) { logger.warn('resetSelection not implemented'); },

        isFocused: function () {
            return this.focus;
        }
    });
});