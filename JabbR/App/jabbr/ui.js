/*global define, window, document, setTimeout*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/events',
    'jabbr/components/connection-status',
    'jabbr/components/rooms.ui',
    'jabbr/components/help',
    'jabbr/utility',
    'jquery.pulse'
], function ($, Logger, kernel, state, events,
    connectionStatus, ru, help,
    utility
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
            $hiddenFile = $('#hidden-file'),
            $submitButton = $('#send'),
            $newMessage = $('#new-message'),
            $fileUploadButton = $('.upload-button'),
            $logout = $('#preferences .logout'),
            $updatePopup = $('#jabbr-update'),
            readOnly = false,
            focus = true,
            originalTitle = document.title,
            unread = 0,
            isUnreadMessageForUser = false,
            newMessageLines = 1,
            Keys = { Up: 38, Down: 40, Esc: 27, Enter: 13, Backspace: 8, Slash: 47, Space: 32, Tab: 9, Question: 191 },
            checkingStatus = false,
            typing = false,
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
                client.focus();
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
                    ru.setRoomTrimmable(client.chat.state.activeRoom, typing);
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

        function updateUnread(room, isMentioned) {
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
            ru.openRoomFromHash();

            // Otherwise set the active room
            ru.setActiveRoom(state.get().activeRoom || 'Lobby');

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

        function clientNudge(from, to) {
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
        }

        // Global Events
        events.bind(events.ui.clearUnread, clearUnread);
        events.bind(events.ui.updateUnread, updateUnread);
        events.bind(events.ui.updateTitle, updateTitle);

        // DOM

        $window.focus(function () {
            // clear unread count in active room
            var room = ru.getCurrentRoomElements();
            room.makeActive();

            if (!focus) {
                triggerFocus();
            }
        });

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

        $logout.click(function () {
            client.performLogout();
        });

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

                client.chat.client.nudge = clientNudge;
                client.chat.client.forceUpdate = showUpdatePopup;
                client.chat.client.outOfSync = showUpdatePopup;
            },

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