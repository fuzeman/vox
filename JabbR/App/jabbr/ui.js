/*global define, window, document, setTimeout, setInterval, clearInterval*/
define([
    'jquery',
    'logger',
    'kernel',
    'keys',
    'jabbr/state',
    'jabbr/events',
    'jabbr/components/connection-status',
    'jabbr/components/rooms.ui',
    'jabbr/components/help',
    'jabbr/utility',
    'jquery.pulse'
], function ($, Logger, kernel, Keys,
    state, events, connectionStatus,
    ru, help, utility
) {
    var logger = new Logger('jabbr/ui'),
        client = null,
        rc = null,
        lobby = null,
        messages = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $window = $(window),
            $document = $(document),
            $hiddenFile = $('#hidden-file'),
            $submitButton = $('#send'),
            $newMessage = $('#new-message'),
            $fileUploadButton = $('.upload-button'),
            $logout = $('#preferences .logout'),
            $updatePopup = $('#jabbr-update'),
            $lobbyWrapper = $('#lobby-wrapper'),
            $sendMessage = $('#send-message'),
            $roomFilterInput = $('#room-filter'),
            readOnly = false,
            focus = true,
            originalTitle = document.title,
            unread = 0,
            isUnreadMessageForUser = false,
            newMessageLines = 1,
            checkingStatus = false,
            typing = false,
            lastCycledMessage = null,
            historyLocation = 0,
            updateTimeout = 15000;

        //
        // Private Functions
        //

        function setReadOnly(isReadOnly) {
            readOnly = isReadOnly;

            if (readOnly === true) {
                $hiddenFile.attr('disabled', 'disabled');
                $submitButton.attr('disabled', 'disabled');
                $newMessage.attr('disabled', 'disabled');
                $fileUploadButton.attr('disabled', 'disabled');
            } else {
                $hiddenFile.removeAttr('disabled');
                $submitButton.removeAttr('disabled');
                $newMessage.removeAttr('disabled');
                $fileUploadButton.removeAttr('disabled');
            }
        }

        setReadOnly(false); // TODO: is this actually needed?

        function toggleMessageSection(disabledIt) {
            if (disabledIt) {
                // disable send button, textarea and file upload
                $newMessage.attr('disabled', 'disabled');
                $submitButton.attr('disabled', 'disabled');
                $fileUploadButton.attr('disabled', 'disabled');
                $hiddenFile.attr('disabled', 'disabled');
            } else if (!readOnly) {
                // re-enable textarea button
                $newMessage.attr('disabled', '');
                $newMessage.removeAttr('disabled');

                // re-enable submit button
                $submitButton.attr('disabled', '');
                $submitButton.removeAttr('disabled');

                // re-enable file upload button
                $fileUploadButton.attr('disabled', '');
                $fileUploadButton.removeAttr('disabled');
                $hiddenFile.attr('disabled', '');
                $hiddenFile.removeAttr('disabled');
            }
        }

        function triggerFocus() {
            if (!utility.isMobile && !readOnly) {
                $newMessage.focus();
            }

            if (focus === false) {
                focus = true;
                client.focused();
            }
        }

        function triggerSend() {
            if (readOnly) {
                return;
            }

            var id = $newMessage.attr('message-id');
            var msg = $.trim($newMessage.val());

            focus = true;

            if (msg) {
                if (msg.toUpperCase() === '/LOGIN') {
                    //TODO: ui.showLogin(); is this used?
                } else {
                    if (id === undefined) {
                        messages.sendMessage(msg);
                    } else {
                        messages.sendMessage({ content: msg, id: id });
                    }
                }
            }

            $newMessage.val('');
            newMessageLines = 1;
            //TODO: updateNewMessageSize();
            $newMessage.removeAttr('message-id');
            $newMessage.removeClass('editing');
            $('#m-' + id).removeClass('editing');
            $newMessage.focus();

            // always scroll to bottom after new message sent
            var room = ru.getCurrentRoomElements();
            room.scrollToBottom();
            room.removeSeparator();
        }

        function triggerTyping() {
            // If not in a room, don't try to send typing notifications
            if (!client.chat.state.activeRoom) {
                return;
            }

            if (checkingStatus === false && typing === false) {
                typing = true;

                try {
                    rc.setRoomTrimmable(client.chat.state.activeRoom, typing);
                    client.chat.server.typing(client.chat.state.activeRoom);
                }
                catch (e) {
                    client.connection.hub.log('Failed to send via websockets');
                }

                window.setTimeout(function () {
                    typing = false;
                },
                3000);
            }
        }

        function updateUnread(event, room, isMentioned) {
            room = typeof room !== 'undefined' ? room : client.chat.state.activeRoom;
            isMentioned = typeof isMentioned !== 'undefined' ? isMentioned : false;

            clearUnread();

            if (focus === false) {
                isUnreadMessageForUser = (isUnreadMessageForUser || isMentioned);

                unread = unread + 1;
            } else {
                //we're currently focused so remove
                //the * notification
                isUnreadMessageForUser = false;
            }

            events.trigger(events.rooms.ui.updateUnread, [room, isMentioned]);

            updateTitle();
        }

        function clearUnread() {
            isUnreadMessageForUser = false;
            unread = 0;
        }

        function updateTitle() {
            // ugly hack via http://stackoverflow.com/a/2952386/188039
            setTimeout(function () {
                if (unread === 0) {
                    document.title = originalTitle;
                } else {
                    document.title = (isUnreadMessageForUser ? '*' : '') + '(' + unread + ') ' + originalTitle;
                }
            }, 200);
        }

        function showUpdatePopup() {
            $updatePopup.modal();

            window.setTimeout(function () {
                // Reload the page
                document.location = document.location.pathname;
            },
            updateTimeout);
        }

        function updateNewMessageSize() {
            $sendMessage.height(20 + (20 * newMessageLines));
            $newMessage.height(20 * newMessageLines);

            // Update Lobby
            $lobbyWrapper.css('bottom', 30 + (20 * newMessageLines));

            // Update Current Room
            var room = ru.getCurrentRoomElements();
            room.messages.css('bottom', 20 + (20 * newMessageLines));
            room.users.css('bottom', 30 + (20 * newMessageLines));
        }

        function setMessage(clientMessage) {
            $newMessage.val(clientMessage.content);

            newMessageLines = clientMessage.content.split('\n').length;
            updateNewMessageSize();

            $('.my-message').removeClass('editing');

            if (clientMessage.id !== undefined) {
                $newMessage.attr('message-id', clientMessage.id);

                $newMessage.addClass('editing');

                $('#m-' + clientMessage.id).addClass('editing');
                $('#m-' + clientMessage.id)[0].scrollIntoView();

                lastCycledMessage = clientMessage.id;
            }

            if (clientMessage.content) {
                $newMessage.selectionEnd = clientMessage.content.length;
            }
        }

        // handle click on names in chat / room list
        function prepareMessage(ev) {
            if (readOnly) {
                return false;
            }

            var message = $newMessage.val().trim();

            // If it was a message to another person, replace that
            if (message.indexOf('/msg') === 0) {
                message = message.replace(/^\/msg \S+/, '');
            }

            // Re-focus because we lost it on the click
            $newMessage.focus();

            // Do not convert this to a message if it is a command
            if (message[0] === '/') {
                return false;
            }

            var mention = '@' + $(this).text().trim();

            var $li = $(this).closest('li');
            if ($li.data('mention') === undefined) {
                $li = $('.users li.user[data-name="' + $li.data('name') + '"]');
            }
            if ($li.data('mention') !== undefined && $li.data('mention') !== '') {
                mention = $li.data('mention').replace(/\b[a-z]/g, function (letter) {
                    return letter.toUpperCase();
                }) + ',';
            }

            // Prepend our target username
            message = mention + ' ' + message;
            setMessage({ content: message });
            return false;
        }

        // #region Cycle Message

        function selectMessage(message) {
            if (!message.replaced) {
                var retries = 0;
                var awaitMessageId = setInterval(function () {
                    if (message.replaced) {
                        setMessage(message);
                        clearInterval(awaitMessageId);
                    }
                    if (retries > 25) {
                        clearInterval(awaitMessageId);
                    }
                    retries += 1;
                }, 100);
            } else {
                setMessage(message);
            }
        }

        function prevMessage() {
            historyLocation -= 1;

            // Skip Command Messages
            while (historyLocation >= 0 &&
                rc.messageHistory[client.chat.state.activeRoom][historyLocation].content[0] === '/') {
                historyLocation -= 1;
            }

            // Ensure location is valid
            if (historyLocation < 0) {
                historyLocation = (rc.messageHistory[client.chat.state.activeRoom] || []).length - 1;
            }

            if (historyLocation >= 0) {
                selectMessage(rc.messageHistory[client.chat.state.activeRoom][historyLocation]);
            }
        }

        function nextMessage() {
            historyLocation += 1;

            // Skip commands
            while (historyLocation < (rc.messageHistory[client.chat.state.activeRoom] || []).length &&
                rc.messageHistory[client.chat.state.activeRoom][historyLocation].content[0] === '/') {
                historyLocation += 1;
            }

            // Ensure location is valid
            historyLocation = (historyLocation) % (rc.messageHistory[client.chat.state.activeRoom] || []).length;

            if (historyLocation >= 0) {
                selectMessage(rc.messageHistory[client.chat.state.activeRoom][historyLocation]);
            }
        }

        function cycleMessage(direction) {
            var currentMessage = $newMessage.attr('message-id');

            if (currentMessage === undefined || lastCycledMessage === currentMessage) {
                if (direction == 'prev') {
                    prevMessage();
                } else if (direction == 'next') {
                    nextMessage();
                }
                return true;
            }

            return false;
        }

        // #endregion

        //
        // Event Handlers
        //

        // Room

        function ruActivateRoom(event, activateRoom) {
            toggleMessageSection(activateRoom.isClosed());
        }

        // Client

        function clientConnected(event, change, initial) {
            if (!initial) {
                setReadOnly(false);
            }
        }

        function clientDisconnected() {
            setReadOnly(true);
        }

        function clientLoggedOn(event, currentRooms) {
            ru.addRooms(currentRooms);

            // Process any urls that may contain room names
            rc.openRoomFromHash();

            // Otherwise set the active room
            rc.setActiveRoom(state.get().activeRoom || 'Lobby');

            var loadRooms = function () {
                $.each(currentRooms, function (index, loadRoom) {
                    if (client.chat.state.activeRoom !== loadRoom.Name) {
                        rc.populateRoom(loadRoom.Name);
                    }
                });
            };

            // Populate lobby rooms for intellisense
            lobby.updateRooms();

            if (state.get().activeRoom) {
                // Always populate the active room first then load the other rooms so it looks fast :)
                rc.populateRoom(state.get().activeRoom).done(loadRooms);
            } else {
                // There's no active room so we don't care
                loadRooms();
            }
        }

        // Global Events
        events.bind(events.ui.clearUnread, clearUnread);
        events.bind(events.ui.updateUnread, updateUnread);
        events.bind(events.ui.updateTitle, updateTitle);

        // #region DOM Events

        $window.blur(function () {
            focus = false;
            updateTitle();
        });

        $window.focus(function () {
            // clear unread count in active room
            var room = ru.getCurrentRoomElements();
            room.makeActive();

            if (!focus) {
                triggerFocus();
            }
        });

        $window.resize(function () {
            var room = ru.getCurrentRoomElements();
            room.makeActive();
            room.scrollToBottom();
        });

        function windowKeyFocus(ev) {
            if (!$newMessage.is(':focus') &&
                !$roomFilterInput.is(':focus') &&
                !ev.ctrlKey &&
                !ev.altKey) {
                $newMessage.focus();
            }
        }

        $window.keypress(windowKeyFocus);
        $window.keydown(windowKeyFocus);

        $submitButton.click(function (ev) {
            triggerSend();

            ev.preventDefault();
            return false;
        });

        $newMessage.keypress(function (ev) {
            var key = ev.keyCode || ev.which;

            switch (key) {
                case Keys.Up:
                case Keys.Down:
                case Keys.Esc:
                    break;
                case Keys.Enter:
                    if (ev.shiftKey) {
                        triggerTyping();
                    } else {
                        triggerSend();
                        ev.preventDefault();
                    }
                    break;
                default:
                    if ($newMessage.val()[0] === '/' || key === Keys.Slash) {
                        return;
                    }
                    triggerTyping();
                    break;
            }
        });

        $newMessage.keydown(function (ev) {
            var key = ev.keyCode || ev.which;

            switch (key) {
                case Keys.Up:
                    if (($newMessage.val() === '' || $newMessage.hasClass('editing')) &&
                        cycleMessage('prev')) {
                        ev.preventDefault();
                    }
                    break;

                case Keys.Down:
                    if (($newMessage.val() === '' || $newMessage.hasClass('editing')) &&
                        cycleMessage('next')) {
                        ev.preventDefault();
                    }
                    break;

                case Keys.Esc:
                    $(this).val('');
                    newMessageLines = 1;
                    updateNewMessageSize();
                    if ($(this).attr('message-id') !== undefined) {
                        $('#m-' + $(this).attr('message-id')).removeClass('editing');
                        $(this).removeAttr('message-id');
                    }
                    $(this).removeClass('editing');
                    break;

                case Keys.Backspace:
                    setTimeout(function () {
                        newMessageLines = $newMessage.val().split('\n').length;
                        updateNewMessageSize();
                    }, 100);
                    break;

                case Keys.Space:
                    // Check for "/r " to reply to last private message
                    if ($(this).val() === "/r" && messages.getLastPrivate()) {
                        setMessage("/msg " + messages.getLastPrivate());
                    }
                    break;
            }
        });

        $logout.click(function () {
            client.performLogout();
        });

        $document.on('click', '.users li.user .name', prepareMessage);
        $document.on('click', '.message .left .name', prepareMessage);

        // #endregion

        // Configure livestamp to only update every 30s since display
        // granularity is by minute anyway (saves CPU cycles)
        $.livestamp.interval(30 * 1000);

        var handlers = {
            bind: function () {
                client.chat.client.nudge = this.clientNudge;
                client.chat.client.mentionsChanged = this.mentionsChanged;

                client.chat.client.forceUpdate = showUpdatePopup;
                client.chat.client.outOfSync = showUpdatePopup;
            },

            clientNudge: function (from, to) {
                function shake(n) {
                    var move = function (x, y) {
                        parent.moveBy(x, y);
                    };
                    for (var i = n; i > 0; i--) {
                        for (var j = 1; j > 0; j--) {
                            move(i, 0);
                            move(0, -i);
                            move(-i, 0);
                            move(0, i);
                            move(i, 0);
                            move(0, -i);
                            move(-i, 0);
                            move(0, i);
                            move(i, 0);
                            move(0, -i);
                            move(-i, 0);
                            move(0, i);
                        }
                    }
                }

                $("#chat-area").pulse({ opacity: 0 }, { duration: 300, pulses: 3 });

                window.setTimeout(function () {
                    shake(20);
                }, 300);

                messages.addMessage('*' + from + ' nudged ' + (to ? 'you' : 'the room'), to ? 'pm' : 'notification');
            },

            mentionsChanged: function (mentions) {
                client.updateMentions(mentions);

                var message = null;

                if (mentions.length == 0) {
                    message = 'cleared';
                } else {
                    message = 'set to ' + mentions.join(", ");
                }

                messages.addMessage('Your mention strings have been ' + message,
                    'notification', state.get().activeRoom);
            }
        };

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                rc = kernel.get('jabbr/components/rooms.client');
                lobby = kernel.get('jabbr/components/lobby');
                messages = kernel.get('jabbr/components/messages');

                connectionStatus.activate();
                ru.activate();
                help.activate();

                logger.trace('activated');

                // Bind events
                ru.bind(events.rooms.ui.activateRoom, ruActivateRoom);

                client.bind(events.client.connected, clientConnected);
                client.bind(events.client.disconnected, clientDisconnected);
                client.bind(events.client.loggedOn, clientLoggedOn);

                handlers.bind();
            },

            toggleMessageSection: toggleMessageSection,

            isFocused: function () {
                return focus;
            }
        };
    };

    return function () {
        if (object === null) {
            // initialize sub-modules
            connectionStatus = connectionStatus();
            ru = ru();
            help = help();

            object = initialize();
            kernel.bind('jabbr/ui', object);
        }

        return object;
    };
});