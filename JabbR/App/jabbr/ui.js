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
    'jabbr/components/client-settings',
    'jabbr/components/external-status',
    'jabbr/components/emoji',
    'jabbr/utility',
    'jquery.pulse',
    'jquery.autotabcomplete'
], function ($, Logger, kernel, Keys,
    state, events, connectionStatus,
    ru, help, cs, externalStatus,
    emoji, utility
) {
    var logger = new Logger('jabbr/ui'),
        client = null,
        rc = null,
        lobby = null,
        messages = null,
        notifications = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $window = $(window),
            $document = $(document),
            $chatArea = $('#chat-area'),
            $hiddenFile = $('#hidden-file'),
            $submitButton = $('#send'),
            $newMessage = $('#new-message'),
            $fileUploadButton = $('.upload-button'),
            $logout = $('#preferences .logout'),
            $updatePopup = $('#jabbr-update'),
            $lobbyWrapper = $('#lobby-wrapper'),
            $sendMessage = $('#send-message'),
            $roomFilterInput = $('#room-filter'),
            $tabs = $('#tabs'),
            $messageTotal = $('#message-total .value'),
            $clockTime = $('#clock .time'),
            $clockDate = $('#clock .date'),
            $splashScreen = $('#splash-screen'),
            readOnly = false,
            focus = true,
            originalTitle = document.title,
            unread = 0,
            isUnreadMessageForUser = false,
            newMessageLines = 1,
            checkingStatus = false,
            typing = false,
            lastCycledMessage = null,
            updateTimeout = 15000,
            currentMessageCount = null,
            nextMessageCountUpdateAt = null,
            messagesReceivedSince = 0;

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

            var id = $newMessage.attr('message-id'),
                value = $newMessage.val(),
                lines = value.split('\n');

            if (lines.length < 2) {
                value = $.trim(value);
            }

            focus = true;

            if (value) {
                if (id === undefined) {
                    messages.sendMessage(value);
                } else {
                    messages.sendMessage({ content: value, id: id });
                }
            }
            resetSelection(id);
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
            
            updateTitle();
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

            // Update Chat Area
            $chatArea.css('bottom', 30 + (20 * newMessageLines));
        }

        function setMessage(clientMessage) {
            if (clientMessage !== undefined && clientMessage.content !== undefined) {
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

                $newMessage.selectionEnd = clientMessage.content.length;
            }
        }
        
        function resetSelection(id) {
            if (id !== undefined) {
                $('#m-' + id).removeClass('editing');
            } else {
                $('.my-message').removeClass('editing');
            }

            $newMessage.val('');
            
            newMessageLines = 1;
            updateNewMessageSize();
            
            $newMessage.removeAttr('message-id');
            $newMessage.removeClass('editing');
        }

        // handle click on names in chat / room list
        function prepareMessage() {
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

        // Splash Screen
        function showSplashScreen() {
            $splashScreen.fadeIn('slow');
        }

        function hideSplashScreen() {
            $splashScreen.fadeOut('slow');
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
            rc.historyLocation -= 1;

            // Skip Command Messages
            while (rc.historyLocation >= 0 &&
                rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation].content[0] === '/') {
                rc.historyLocation -= 1;
            }

            // Ensure location is valid
            if (rc.historyLocation < 0) {
                rc.historyLocation = (rc.messageHistory[client.chat.state.activeRoom] || []).length - 1;
            }

            if (rc.historyLocation >= 0) {
                selectMessage(rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation]);
            }
        }

        function nextMessage() {
            rc.historyLocation += 1;

            // Skip commands
            while (rc.historyLocation < (rc.messageHistory[client.chat.state.activeRoom] || []).length &&
                rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation].content[0] === '/') {
                rc.historyLocation += 1;
            }

            // Ensure location is valid
            rc.historyLocation = (rc.historyLocation) % (rc.messageHistory[client.chat.state.activeRoom] || []).length;

            if (rc.historyLocation >= 0) {
                selectMessage(rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation]);
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

        // #region Message Count Display

        function incrementMessageCount() {
            updateMessageCount(1);
        }

        function setMessageCount(count) {
            $messageTotal.text(utility.formatNumber(count));
        }

        function updateMessageCount(delta) {
            delta = typeof delta !== 'undefined' ? delta : 0;

            if (currentMessageCount === null || messagesReceivedSince > nextMessageCountUpdateAt) {
                client.chat.server.getMessageCount()
                    .done(function (count) {
                        currentMessageCount = count;
                        messagesReceivedSince = delta;
                        nextMessageCountUpdateAt = Math.floor((Math.random() * 300) + 100);

                        setMessageCount(currentMessageCount + messagesReceivedSince);
                    });
            } else {
                messagesReceivedSince += delta;
                setMessageCount(currentMessageCount + messagesReceivedSince);
            }
        }

        // #endregion

        //
        // Event Handlers
        //

        // Room

        function ruActivateRoom(event, activateRoom) {
            toggleMessageSection(activateRoom.isClosed());
        }

        function populateRooms(rooms) {
            client.connection.hub.log('loadRooms(' + rooms.join(', ') + ')');

            // Populate the list of users rooms and messages
            client.chat.server.loadRooms(rooms)
                .done(function() {
                    client.connection.hub.log('loadRooms.done(' + rooms.join(', ') + ')'); 
                })
                .fail(function (e) {
                    client.connection.hub.log('loadRooms.failed(' + rooms.join(', ') + ', ' + e + ')'); 
                });
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

        function clientLoggedOn(event, currentRooms, ownedRooms, preferences, mentions, unreadNotifications) {
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

                // Set the amount of rooms to load
                rc.roomsToLoad(filteredRooms.length);

                populateRooms(filteredRooms);
                
                // Set current unread messages
                $.each(unreadNotifications, function (index, notification) {
                    messages.setMessageReadState(notification.MessageId, false);
                });
            };

            if (state.get().activeRoom) {
                // Always populate the active room first then load the other rooms so it looks fast :)
                rc.populateRoom(state.get().activeRoom).done(function() {
                    help.load();
                    lobby.updateRooms();
                    loadRooms();

                    // No rooms to load just hide the splash screen
                    if (rc.roomsToLoad() === 0) {
                        hideSplashScreen();
                    }
                });
            } else {
                // Populate the lobby first then everything else
                lobby.updateRooms().done(function() {
                    help.load();
                    loadRooms();

                    // No rooms to load just hide the splash screen
                    if (rc.roomsToLoad() === 0) {
                        hideSplashScreen();
                    }
                });
            }

            // Update server message count display
            updateMessageCount();
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
            
            if(room !== null) {
                room.makeActive();
                room.scrollToBottom();
            }
        });

        function windowKeyFocus(ev) {
            if (!$newMessage.is(':focus') &&
                !$roomFilterInput.is(':focus') &&
                !cs.isOpen() &&
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
                        setTimeout(function () {
                            newMessageLines = $newMessage.val().split('\n').length;
                            updateNewMessageSize();
                        }, 100);

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

        // handle tab cycling - we skip the lobby when cycling
        // handle shift+/ - display help command
        $document.on('keydown', function (ev) {
            // ctrl + tab event is sent to the page in firefox when the user probably means to change browser tabs
            if (ev.keyCode === Keys.Tab && $newMessage.val() === "" && !ev.ctrlKey) {
                var current = ru.getCurrentRoomElements(),
                    index = current.tab.index(),
                    tabCount = $tabs.children().length - 1;

                if (!ev.shiftKey) {
                    // Next tab
                    index = index % tabCount + 1;
                } else {
                    // Prev tab
                    index = (index - 1) || tabCount;
                }

                rc.setActiveRoom($tabs.children().eq(index).data('name'));
                if (!readOnly) {
                    $newMessage.focus();
                }

                ev.preventDefault();
            }

            if (!$newMessage.is(':focus') && ev.shiftKey && ev.keyCode === Keys.Question) {
                help.show();
                // Prevent the ? be recorded in the message box
                ev.preventDefault();
            }
        });

        $newMessage.bind('paste', function () {
            setTimeout(function () {
                newMessageLines = $newMessage.val().split('\n').length;
                updateNewMessageSize();
            }, 100);
        });

        // Auto-complete for user names
        $newMessage.autoTabComplete({
            prefixMatch: '[a-z@#/:]',

            get: function (prefix) {
                var room = ru.getCurrentRoomElements();

                switch (prefix) {
                    case '@':
                        // exclude current username from autocomplete
                        return room.users.find('li[data-name != "' + client.chat.state.name + '"]')
                            .not('.room')
                            .map(function () {
                                if ($(this).data('name')) {
                                    return $(this).data('name') + ' ';
                                }

                                return '';
                            })
                            .sort(function(a, b) {
                                return a.toString().toUpperCase().localeCompare(b.toString().toUpperCase());
                            });
                    case '#':
                        return lobby.getRooms()
                            .map(function(room) { return room.Name + ' '; });
                    case '/':
                        return help.getCommands()
                            .map(function (cmd) { return cmd.Name + ' '; });
                    case ':':
                        return emoji.getIcons();
                    default:
                        // exclude current username from autocomplete
                        return $.grep(room.users.find('li[data-name != "' + client.chat.state.name + '"]')
                            .not('.room')
                            .map(function () {
                                var mention = $(this).data('mention');
                                
                                if (mention !== undefined && mention !== null &&
                                    mention[0] == prefix.toLowerCase()) {
                                    return (mention.substr(1) + ' ' || "").toString();
                                }
                                
                                return "";
                            }), function (s) { return s.length !== 0; });
                }
            }
        });

        // #endregion

        //
        // Clock
        //

        var shortMonth = ["Jan", "Feb", "Mar",
            "Apr", "May", "Jun", "Jul", "Aug", "Sep",
            "Oct", "Nov", "Dec"];

        // Update clock every second
        setInterval(function () {
            var date = new Date();

            var hours24 = date.getHours(),
                hours = ((hours24 + 11) % 12) + 1,
                period = hours24 > 11 ? 'PM' : 'AM';

            $clockTime.text(hours + ':' + utility.padZero(date.getMinutes()) + ' ' + period);

            $clockDate.text(date.getDate() + ' ' + shortMonth[date.getMonth()] + ' ' + date.getFullYear());
        }, 1000);


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

            clientNudge: function (from, to, roomName) {
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

                if (to) {
                    if (rc.isSelf({ Name: to })) {
                        message = utility.getLanguageResource('Chat_UserNudgedYou', from);
                    } else {
                        message = utility.getLanguageResource('Chat_UserNudgedUser', from, to);
                    }

                    // TODO: make this more consistent (ie make it a broadcast, proper pm to all rooms, or something)
                    messages.addPrivateMessage(message);
                } else {
                    messages.addPrivateMessage(utility.getLanguageResource('Chat_UserNudgedRoom', from, roomName));
                }
                
                notifications.notifyMention(true);
            },

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
            }
        };

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                rc = kernel.get('jabbr/components/rooms.client');
                lobby = kernel.get('jabbr/components/lobby');
                messages = kernel.get('jabbr/components/messages');
                notifications = kernel.get('jabbr/components/notifications');

                connectionStatus.activate();
                ru.activate();
                help.activate();
                cs.activate();
                externalStatus.activate();

                logger.trace('activated');

                // Bind events
                ru.bind(events.rooms.ui.activateRoom, ruActivateRoom);

                client.bind(events.client.connected, clientConnected);
                client.bind(events.client.disconnected, clientDisconnected);
                client.bind(events.client.loggedOn, clientLoggedOn);

                handlers.bind();
            },

            toggleMessageSection: toggleMessageSection,
            incrementMessageCount: incrementMessageCount,
            setMessage: setMessage,
            resetSelection: resetSelection,

            showSplashScreen: showSplashScreen,
            hideSplashScreen: hideSplashScreen,

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
            cs = cs();
            externalStatus = externalStatus();

            object = initialize();
            kernel.bind('jabbr/ui', object);
        }

        return object;
    };
});