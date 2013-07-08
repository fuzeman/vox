/*global define, window, clearTimeout, moment*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/templates',
    'jabbr/events',
    'jabbr/utility',
    'jabbr/viewmodels/message',
    'jabbr/messageprocessors/collapse'
], function ($, Logger, kernel, templates, events, utility, Message, collapse
) {
    var logger = new Logger('jabbr/components/messages'),
        client = null,
        rc = null,
        ru = null,
        notifications = null,
        processor = null,
        object = null;

    var initialize = function () {
        var messageSendingDelay = 1500;

        function addChatMessage(message, roomName) {
            var room = ru.getRoomElements(roomName),
                $previousMessage = room.messages.children().last(),
                previousUser = null,
                previousTimestamp = new Date().addDays(1), // Tomorrow so we always see a date line
                showUserName = true,
                isNotification = message.messageType === 1;

            // bounce out of here if the room is closed
            if (room.isClosed()) {
                return;
            }

            if ($previousMessage.length > 0) {
                previousUser = $previousMessage.data('name');
                previousTimestamp = new Date($previousMessage.data('timestamp') || new Date());
            }

            // Force a user name to show if a header will be displayed
            if (message.date.toDate().diffDays(previousTimestamp.toDate())) {
                previousUser = null;
            }

            // Determine if we need to show the user name next to the message
            showUserName = previousUser !== message.name && !isNotification;
            message.showUser = showUserName;

            processMessage(message, roomName);

            if (showUserName === false) {
                $previousMessage.addClass('continue');
            }

            // check to see if room needs a separator
            if (room.needsSeparator()) {
                // if there's an existing separator, remove it
                if (room.hasSeparator()) {
                    room.removeSeparator();
                }
                room.addSeparator();
            }

            if (isNotification === true) {
                var model = {
                    id: message.id,
                    content: message.message,
                    img: message.imageUrl,
                    source: message.source,
                    encoded: true
                };

                addMessage(model, 'postedNotification', roomName);
            } else {
                appendMessage(templates.message.tmpl(message), room);

                // TODO: Add message to ticker
                /*if (!message.isMine && !message.isHistory && roomName != currentRoomName) {
                    messageTicker.appendMessage(message, roomName);
                }*/
            }

            if (message.htmlContent) {
                addChatMessageContent(message.id, message.htmlContent, room.getName());
            }

            // Trigger notification
            notifications.messageNotification(message, room);
        }

        function addChatMessageContent(id, content, roomName) {
            var $message = $('#m-' + id),
                $middle = $message.find('.middle'),
                $body = $message.find('.content');

            content = processor.processRichContent(content, {
                roomName: roomName
            });

            if ($middle.length === 0) {
                $body.append('<p>' + content + '</p>');
            } else {
                $middle.append(
                    processor.beforeRichElementAttached($(content))
                );
            }

            processor.afterRichElementAttached($middle);
        }

        function appendMessage(newMessage, room) {
            // Determine if we need to show a new date header: Two conditions
            // for instantly skipping are if this message is a date header, or
            // if the room only contains non-chat messages and we're adding a
            // non-chat message.
            var isMessage = $(newMessage).is('.message');
            if (!$(newMessage).is('.date-header') && (isMessage || room.hasMessages())) {
                var lastMessage = room.messages.find('li[data-timestamp]').last(),
                    lastDate = new Date(lastMessage.data('timestamp')),
                    thisDate = new Date($(newMessage).data('timestamp'));

                if (!lastMessage.length || thisDate.toDate().diffDays(lastDate.toDate())) {
                    var dateDisplay = moment(thisDate);
                    addMessage(dateDisplay.format('dddd, MMMM Do YYYY'), 'date-header list-header', room.getName())
                        .find('.right').remove(); // remove timestamp on date indicator
                }
            }

            if (isMessage) {
                room.updateMessages(true);
            }

            $(newMessage).appendTo(room.messages);
        }

        function addMessage(content, type, roomName) {
            var room = roomName ? ru.getRoomElements(roomName) : ru.getCurrentRoomElements(),
                nearEnd = room.isNearTheEnd(),
                $element = null;

            $element = prepareNotificationMessage(content, type);

            appendMessage($element, room);

            if (type === 'notification' && room.isLobby() === false) {
                collapseNotifications($element);
            }

            if (nearEnd) {
                ru.scrollToBottom(roomName);
            }

            return $element;
        }

        function sendMessage(msg) {
            events.trigger(events.ui.clearUnread);

            var id, clientMessage, type, messageCompleteTimeout = null;

            if (typeof msg === 'object' && 'content' in msg && msg[0] !== '/') {
                type = 'replace';
                id = msg.id;
                clientMessage = msg;

                clientMessage.room = client.chat.state.activeRoom;
            } else {
                type = 'append';
                id = utility.newId();

                clientMessage = {
                    id: id,
                    replaced: false,
                    content: msg,
                    room: client.chat.state.activeRoom
                };
            }

            if (msg[0] !== '/') {
                // if you're in the lobby, you can't send mesages (only commands)
                if (client.chat.state.activeRoom === undefined) {
                    addMessage('You cannot send messages within the Lobby', 'error');
                    return false;
                }

                // Added the message to the ui first
                var viewModel = {
                    name: client.chat.state.name,
                    hash: client.chat.state.hash,
                    message: processor.processPlainContent(clientMessage.content),
                    id: clientMessage.id,
                    date: new Date(),
                    highlight: '',
                    isMine: true
                };

                if (type === 'append') {
                    addChatMessage(viewModel, clientMessage.room);
                } else {
                    replaceMessageElement(viewModel);
                }

                // If there's a significant delay in getting the message sent
                // mark it as pending
                messageCompleteTimeout = window.setTimeout(function () {
                    if ($.connection.hub.state === $.connection.connectionState.reconnecting) {
                        failMessage(id);
                    } else {
                        // If after a second
                        markMessagePending(id);
                    }
                },
                    messageSendingDelay);

                rc.pendingMessages[id] = messageCompleteTimeout;
            }

            rc.historyLocation = 0;

            sendClientMessage(clientMessage, messageCompleteTimeout);
            historyPush(type, clientMessage);
        }

        function sendClientMessage(clientMessage, messageCompleteTimeout) {
            try {
                client.chat.server.send(clientMessage)
                    .done(function () {
                        if (messageCompleteTimeout) {
                            clearTimeout(messageCompleteTimeout);
                            delete rc.pendingMessages[clientMessage.id];
                        }

                        confirmMessage(clientMessage.id);
                    })
                    .fail(function (e) {
                        failMessage(clientMessage.id);
                        addMessage(e, 'error');
                    });
            } catch (e) {
                client.connection.hub.log('Failed to send via websockets');

                clearTimeout(rc.pendingMessages[clientMessage.id]);
                failMessage(clientMessage.id);
            }
        }

        function historyPush(type, clientMessage) {
            if (type === 'replace') {
                // Search for message in history and replace it
                for (var i = 0; i < (rc.messageHistory[client.chat.state.activeRoom] || []).length; i++) {
                    if (rc.messageHistory[client.chat.state.activeRoom][i].id == clientMessage.id) {
                        rc.messageHistory[client.chat.state.activeRoom][i] = clientMessage;
                    }
                }
            }
            if (type == 'append') {
                // Ensure room exists
                if (rc.messageHistory[client.chat.state.activeRoom] === undefined) {
                    rc.messageHistory[client.chat.state.activeRoom] = [];
                }

                rc.messageHistory[client.chat.state.activeRoom].push(clientMessage);
            }

            // REVIEW: should this pop items off the top after a certain length?
            rc.historyLocation = (rc.messageHistory[client.chat.state.activeRoom] || []).length;
        }

        function confirmMessage(id) {
            $('#m-' + id).removeClass('failed')
                .removeClass('loading');
        }

        function processMessage(message, roomName) {
            message.when = message.date.formatTime(true);
            message.fulldate = message.date.toLocaleString();

            message.message = collapse.process(message.message, {
                roomName: roomName
            });
        }

        function changeMessageId(oldId, newId) {
            for (var roomName in rc.messageHistory) {
                for (var i = 0; i < rc.messageHistory[roomName].length; i++) {
                    if (rc.messageHistory[roomName][i].id == oldId) {
                        rc.messageHistory[roomName][i].id = newId;
                        rc.messageHistory[roomName][i].replaced = true;
                        return;
                    }
                }
            }
        }

        function overwriteMessage(id, message) {
            var $message = $('#m-' + id);
            processMessage(message);

            $message.find('.middle').html(message.message);
            $message.attr('id', 'm-' + message.id);

            changeMessageId(id, message.id);
        }

        function replaceMessageElement(message) {
            processMessage(message);

            $('#m-' + message.id).find('.middle')
                                 .html(message.message);
        }

        function messageExists(id) {
            return $('#m-' + id).length > 0;
        }

        function failMessage(id) {
            $('#m-' + id).removeClass('loading')
                         .addClass('failed');
        }

        function markMessagePending(id) {
            var $message = $('#m-' + id);

            if ($message.hasClass('failed') === false) {
                $message.addClass('loading');
            }
        }

        // notifications

        function prepareNotificationMessage(options, type) {
            if (typeof options === 'string') {
                options = { content: options, encoded: false };
            }

            var now = new Date(),
                message = {
                    // TODO: use jabbr/viewmodels/message ?
                    message: options.encoded ? options.content : processor.processPlainContent(options.content),
                    type: type,
                    date: now,
                    when: now.formatTime(true),
                    fulldate: now.toLocaleString(),
                    img: options.img,
                    source: options.source,
                    id: options.id
                };

            return templates.notification.tmpl(message);
        }

        function collapseNotifications($notification) {
            // collapse multiple notifications
            var $notifications = $notification.prevUntil(':not(.notification)');
            if ($notifications.length > 3) {
                $notifications
                    .hide()
                    .find('.info').text(''); // clear any prior text
                $notification.find('.info')
                    .text(' (plus ' + $notifications.length + ' hidden... click to expand)')
                    .removeClass('collapse');
            }
        }

        function expandNotifications($notification) {
            // expand collapsed notifications
            var $notifications = $notification.prevUntil(':not(.notification)'),
                topBefore = $notification.position().top;

            $notification.find('.info')
                .text(' (click to collapse)')
                .addClass('collapse');
            $notifications.show();

            var room = ru.getCurrentRoomElements(),
                topAfter = $notification.position().top,
                scrollTop = room.messages.scrollTop();

            // make sure last notification is visible
            room.messages.scrollTop(scrollTop + topAfter - topBefore + $notification.height());
        }

        function watchMessageScroll(messageIds, roomName) {
            // Given an array of message ids, if there is any embedded content
            // in it, it may cause the window to scroll off of the bottom, so we
            // can watch for that and correct it.
            messageIds = $.map(messageIds, function (id) { return '#m-' + id; });

            var $messages = $(messageIds.join(',')),
                $content = $messages.expandableContent(),
                room = ru.getRoomElements(roomName),
                nearTheEndBefore = room.messages.isNearTheEnd(),
                scrollTopBefore = room.messages.scrollTop();

            if (nearTheEndBefore && $content.length > 0) {
                // Note that the load event does not bubble, so .on() is not
                // suitable here.
                $content.load(function (event) {
                    // If we used to be at the end and our scrollTop() did not
                    // change, then we can safely call scrollToBottom() without
                    // worrying about interrupting the user. We skip this if the
                    // room is already at the end in the event of multiple
                    // images loading at the same time.
                    if (!room.messages.isNearTheEnd() && scrollTopBefore === room.messages.scrollTop()) {
                        room.scrollToBottom();
                        // Reset our scrollTopBefore so we know we are allowed
                        // to move it again if another image loads and the user
                        // hasn't touched it
                        scrollTopBefore = room.messages.scrollTop();
                    }

                    // unbind the event from this object after it executes
                    $(this).unbind(event);
                });
            }
        }

        //
        // Hub Events
        //

        function chatAddMessage(message, room) {
            var viewModel = new Message(message),
                edited = messageExists(viewModel.id);

            ru.scrollIfNecessary(function () {
                // Update your message when it comes from the server
                if (edited) {
                    replaceMessageElement(viewModel);
                } else {
                    addChatMessage(viewModel, room);
                }
            }, room);

            var isMentioned = viewModel.highlight === 'highlight';

            if (!viewModel.isMine && !edited) {
                events.trigger(events.ui.updateUnread, [room, isMentioned]);
            }
        }

        function chatReplaceMessage(id, message, room) {
            confirmMessage(id);

            var viewModel = new Message(message);

            ru.scrollIfNecessary(function () {
                // Update your message when it comes from the server
                overwriteMessage(id, viewModel);
            }, room);

            var isMentioned = viewModel.highlight === 'highlight';

            if (!viewModel.isMine) {
                events.trigger(events.ui.updateUnread, [room, isMentioned]);
            }
        }

        function chatAddMessageContent(id, content, room) {
            ru.scrollIfNecessary(function () {
                addChatMessageContent(id, content, room);
            }, room);

            events.trigger(events.ui.updateUnread, [room, false]); /* isMentioned: this is outside normal messages and user shouldn't be mentioned */

            watchMessageScroll([id], room);
        }

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                rc = kernel.get('jabbr/components/rooms.client');
                ru = kernel.get('jabbr/components/rooms.ui');
                notifications = kernel.get('jabbr/components/notifications');
                processor = kernel.get('jabbr/messageprocessors/processor');

                logger.trace('activated');

                // Bind events
                client.chat.client.addMessage = chatAddMessage;
                client.chat.client.replaceMessage = chatReplaceMessage;
                client.chat.client.addMessageContent = chatAddMessageContent;
            },

            addChatMessage: addChatMessage,
            addMessage: addMessage,
            sendMessage: sendMessage,

            watchMessageScroll: watchMessageScroll
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/messages', object);
        }

        return object;
    };
});