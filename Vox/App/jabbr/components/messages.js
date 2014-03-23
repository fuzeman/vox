/*global define, document, window, clearTimeout, moment*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/templates',
    'jabbr/events',
    'jabbr/utility',
    'jabbr/viewmodels/message',
    'jabbr/components/message-ticker',
    'jabbr/messageprocessors/collapse',

    'moment'
], function (
    $, Logger, kernel, templates,
    events, utility, Message, MessageTicker, collapse
) {
    var logger = new Logger('jabbr/components/messages'),
        client = null,
        ui = null,
        rc = null,
        ru = null,
        notifications = null,
        processor = null,
        object = null;

    var initialize = function () {
        var $document = $(document),
            messageSendingDelay = 1500,
            lastPrivate = null,
            pendingMessages = {},
            unreadMessages = {};

        function dateHeaderFormat(date) {
            return moment(date).format('dddd, MMMM Do YYYY');
        }

        function processMessage(message, roomName) {
            message.when = message.date.formatTime(true);
            message.fulldate = message.date.toLocaleString();

            message.message = collapse.process(message.message, {
                roomName: roomName
            });
        }

        // #region Add Message

        function addChatMessage(message, roomName) {
            var room = ru.getRoomElements(roomName);

            if (room === null) {
                logger.warn('Room does not exist yet');
                return;
            }

            var $previousMessage = room.messages.children().last(),
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

            var currentRoomName = ru.getCurrentRoomElements().getName();

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

                if (!message.isMine && !message.isHistory && roomName != currentRoomName) {
                    MessageTicker.appendMessage(message, roomName);
                }
            }
            
            // Set state if message is unread
            if (unreadMessages[message.id] !== undefined) {
                setMessageReadState(message.id, false);
            }

            // Add rich content
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
                    addMessage(dateHeaderFormat(thisDate), 'date-header list-header', room.getName())
                        .find('.right').remove(); // remove timestamp on date indicator
                }
            }

            if (isMessage) {
                room.updateMessages(true);
            }

            $(newMessage).appendTo(room.messages);
        }

        function addMessage(content, type, roomName) {
            var room = roomName ? ru.getRoomElements(roomName) : ru.getCurrentRoomElements();

            if (room === null) {
                logger.warn('Room does not exist yet');
                return null;
            }

            var nearEnd = room.isNearTheEnd(),
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

        function addMessageBeforeTarget(content, type, $target) {
            var $element = prepareNotificationMessage(content, type);
            $target.before($element);

            return $element;
        }

        function addNotification(message, roomName) {
            addMessage(message, 'notification', roomName);
        }

        function addNotificationToActiveRoom(message) {
            addNotification(message, ru.getActiveRoomName());
        }

        function addError(message, roomName) {
            addMessage(message, 'error', roomName);
        }

        function addErrorToActiveRoom(message) {
            addError(message, ru.getActiveRoomName());
        }

        function addWelcome(message, roomName) {
            addMessage(message, 'welcome', roomName);
        }

        function addWelcomeToActiveRoom(message) {
            addWelcome(message, ru.getActiveRoomName());
        }

        function addList(header, messages, roomName) {
            addMessage(header, 'list-header', roomName);
            
            $.each(messages, function () {
                addMessage(this, 'list-item', roomName);
            });
        }

        function addListToActiveRoom(header, messages) {
            addList(header, messages, ru.getActiveRoomName());
        }

        function addBroadcast(message, roomName) {
            addMessage(message, 'broadcast', roomName);
        }

        function addAction(message, roomName) {
            addMessage(message, 'action', roomName);
        }

        function addPrivateMessage(content, type) {
            var rooms = ru.getAllRoomElements();
            for (var r in rooms) {
                if (rooms[r].getName() !== undefined && rooms[r].isClosed() === false) {
                    addMessage(content, type, rooms[r].getName());
                }
            }
        }

        function prependChatMessages(messages, roomName) {
            var room = rc.getRoom(roomName),
                $messages = room.messages,
                $target = $messages.children().first(),
                $previousMessage = null,
                previousUser = null,
                previousTimestamp = new Date().addDays(1); // Tomorrow so we always see a date line

            if (messages.length === 0) {
                // Mark this list as full
                $messages.data('full', true);
                return;
            }

            // If our top message is a date header, it might be incorrect, so we
            // check to see if we should remove it so that it can be inserted
            // again at a more appropriate time.
            if ($target.is('.list-header.date-header')) {
                var postedDate = new Date($target.text()).toDate();
                var lastPrependDate = messages[messages.length - 1].date.toDate();

                if (!lastPrependDate.diffDays(postedDate)) {
                    $target.remove();
                    $target = $messages.children().first();
                }
            }

            // Populate the old messages
            $.each(messages, function () {
                processMessage(this, roomName);

                if ($previousMessage) {
                    previousUser = $previousMessage.data('name');
                    previousTimestamp = new Date($previousMessage.data('timestamp') || new Date());
                }

                if (this.date.toDate().diffDays(previousTimestamp.toDate())) {
                    addMessageBeforeTarget(dateHeaderFormat(this.date), 'list-header', $target)
                      .addClass('date-header')
                      .find('.right').remove(); // remove timestamp on date indicator

                    // Force a user name to show after the header
                    previousUser = null;
                }

                // Determine if we need to show the user
                this.showUser = !previousUser || previousUser !== this.name;

                // Render the new message
                $target.before(templates.message.tmpl(this));

                if (this.showUser === false) {
                    $previousMessage.addClass('continue');
                }

                $previousMessage = $('#m-' + this.id);
            });

            // If our old top message is a message from the same user as the
            // last message in our prepended history, we can remove information
            // and continue
            if ($target.is('.message') && $target.data('name') === $previousMessage.data('name')) {
                $target.find('.left').children().not('.state').remove();
                $previousMessage.addClass('continue');
            }

            // Scroll to the bottom element so the user sees there's more messages
            $target[0].scrollIntoView();
        }

        // #endregion

        // #region Send Message

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
                    addErrorToActiveRoom(utility.getLanguageResource('Chat_CannotSendLobby'));
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
                    ui.incrementMessageCount();
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

                pendingMessages[id] = messageCompleteTimeout;
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
                            delete pendingMessages[clientMessage.id];
                        }

                        confirmMessage(clientMessage.id);
                    })
                    .fail(function (e) {
                        failMessage(clientMessage.id);
                        if (e.source === 'HubException') {
                            addErrorToActiveRoom(e.message);
                        }
                    });
            } catch (e) {
                client.connection.hub.log('Failed to send via websockets');

                clearTimeout(pendingMessages[clientMessage.id]);
                failMessage(clientMessage.id);
            }
        }

        function failPendingMessages() {
            for (var id in pendingMessages) {
                if (pendingMessages.hasOwnProperty(id)) {
                    clearTimeout(pendingMessages[id]);
                    failMessage(id);
                    delete pendingMessages[id];
                }
            }
        }

        // #endregion

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

            $message.attr('id', 'm-' + message.id);

            $message.find('.middle')
                    .html(message.message);

            $message.find('.right .time')
                    .attr('title', message.fulldate)
                    .text(message.when);

            setEdited($message, message);

            changeMessageId(id, message.id);
        }

        function replaceMessageElement(message) {
            var $message = $('#m-' + message.id);

            processMessage(message);

            $message.find('.middle')
                    .html(message.message);

            setEdited($message, message);
        }
        
        function setEdited($message, message) {
            if (message.editedAt !== null) {
                // Show edited icon
                $message.find('.right .edited')
                        .attr('title', message.editedAt)
                        .css('display', 'inline');
            }
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

        // #region Notifications

        function prepareNotificationMessage(options, type) {
            if (typeof options === 'string') {
                options = { content: options, encoded: false };
            }

            var now = new Date(),
                message = {
                    // TODO: use jabbr/viewmodels/message ?
                    message: options.encoded ? options.content : processor.processPlainContent(options.content, {
                        type: type,
                        source: options.source
                    }),
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

        // #endregion

        // #region DOM Events

        // handle click on notifications
        $document.on('click', '.notification a.info', function () {
            var $notification = $(this).closest('.notification');

            if ($(this).hasClass('collapse')) {
                collapseNotifications($notification);
            } else {
                expandNotifications($notification);
            }
        });
        
        function setMessageReadState(mid, read) {
            var cur = $('#m-' + mid + ' .left a.read');

            // Remove cached state and button if we are marking it read
            if (read) {
                delete unreadMessages[mid];
                cur.remove();
                return;
            }
            
            // Cache 'unread' state (if message doesn't exist yet)
            unreadMessages[mid] = true;

            // Check if button already exists
            if (cur.length > 0) {
                return;
            }
            var $message = $('#m-' + mid + ' .left');

            // Check if message exists
            if ($message.length === 0) {
                logger.warn('Unable to set read state, couldn\'t find message with id "' + mid + '"');
                return;
            }
                
            // Create button
            var $readButton = $('<a href="#" class="read"><i class="icon-ok-circle"></i></a>')
                .click(messageReadClick);
            
            $message.append($readButton);
        }

        function messageReadClick() {
            var message = $(this).closest('.message'),
                mid = message.attr('id').substring(2);

            if (mid !== undefined) {
                client.chat.server.setMessageReadState(mid, true);
            }
        }

        // #endregion

        //
        // Hub Events
        //

        var handlers = {
            bind: function () {
                client.chat.client.addMessage = this.addMessage;
                client.chat.client.addMessageContent = this.addMessageContent;
                client.chat.client.replaceMessage = this.replaceMessage;
                client.chat.client.postMessage = addMessage;

                client.chat.client.sendMeMessage = this.sendMeMessage;
                client.chat.client.sendPrivateMessage = this.sendPrivateMessage;

                client.chat.client.messageReadStateChanged = this.messageReadStateChanged;
            },

            addMessage: function (message, room) {
                var viewModel = new Message(message),
                    edited = messageExists(viewModel.id);

                ru.scrollIfNecessary(function () {
                    // Update your message when it comes from the server
                    if (edited) {
                        replaceMessageElement(viewModel);
                    } else {
                        addChatMessage(viewModel, room);
                        ui.incrementMessageCount();
                    }
                }, room);

                var isMentioned = viewModel.highlight === 'highlight';

                if (!viewModel.isMine && !edited) {
                    events.trigger(events.ui.updateUnread, [room, isMentioned]);
                }
            },

            addMessageContent: function (id, content, room) {
                ru.scrollIfNecessary(function () {
                    addChatMessageContent(id, content, room);
                }, room);

                watchMessageScroll([id], room);
            },

            replaceMessage: function (id, message, room) {
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
            },

            sendMeMessage: function (name, message, room) {
                addAction(utility.getLanguageResource('Chat_UserPerformsAction', name, message), room);
            },

            sendPrivateMessage: function (from, to, message) {
                if (rc.isSelf({ Name: to })) {
                    // Force notification for direct messages
                    notifications.notifyMention(true);
                    lastPrivate = from;
                }

                addPrivateMessage(utility.getLanguageResource('Chat_PrivateMessage', from, to, message));
            },

            messageReadStateChanged: function (mid, read) {
                logger.debug('messageReadStateChanged ' + mid + ' ' + read);
                setMessageReadState(mid, read);
            }
        };

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');
                rc = kernel.get('jabbr/components/rooms.client');
                ru = kernel.get('jabbr/components/rooms.ui');
                notifications = kernel.get('jabbr/components/notifications');
                processor = kernel.get('jabbr/messageprocessors/processor');

                logger.trace('activated');

                handlers.bind();
            },

            appendMessage: appendMessage,
            addChatMessage: addChatMessage,
            addMessage: addMessage,

            // Notification
            addNotification: addNotification,
            addNotificationToActiveRoom: addNotificationToActiveRoom,

            // Error
            addError: addError,
            addErrorToActiveRoom: addErrorToActiveRoom,

            // Welcome
            addWelcome: addWelcome,
            addWelcomeToActiveRoom: addWelcomeToActiveRoom,

            // List
            addList: addList,
            addListToActiveRoom: addListToActiveRoom,

            addBroadcast: addBroadcast,
            addAction: addAction,
            addPrivateMessage: addPrivateMessage,

            sendMessage: sendMessage,
            failPendingMessages: failPendingMessages,
            getLastPrivate: function () {
                return lastPrivate;
            },

            prependChatMessages: prependChatMessages,
            setMessageReadState: setMessageReadState,

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