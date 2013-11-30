/*global define, moment*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/viewmodels/message',
    'jabbr/core/messageprocessors/collapse',
    'jabbr/core/events'
], function ($, Logger, kernel, EventObject, Message, collapse, events) {
    var logger = new Logger('jabbr/components/messages'),
        notifications = null,
        client = null,
        ui = null,
        ru = null,
        rc = null,
        processor = null,
        templates = null;

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.lastPrivate = null;
            this.pendingMessages = {};

            kernel.bind('jabbr/components/messages', this);
        },

        activate: function () {
            notifications = kernel.get('jabbr/components/notifications');
            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            processor = kernel.get('jabbr/messageprocessors/processor');
            templates = kernel.get('jabbr/templates');

            logger.trace('activated');

            this.handlers.bind(this);
        },
        
        processMessage: function (message, roomName) {
            message.when = message.date.formatTime(true);
            message.fulldate = message.date.toLocaleString();

            message.message = collapse.process(message.message, {
                roomName: roomName
            });
        },
        
        // #region Add Message

        addChatMessage: function (message, roomName) {
            var room = ru.getRoomElements(roomName);

            if (room === null) {
                logger.warn('Room does not exist yet');
                return;
            }

            // bounce out of here if the room is closed
            if (room.isClosed()) {
                return;
            }

            var previousMessage = room.getLastMessage(),
                showUserName = true,
                isNotification = message.messageType === 1;;

            if (previousMessage.timestamp === null) {
                previousMessage.timestamp = new Date().addDays(1); // Tomorrow so we always see a date line
            }

            // Force a user name to show if a header will be displayed
            if (message.date.toDate().diffDays(previousMessage.timestamp.toDate())) {
                previousMessage.name = null;
            }

            // Determine if we need to show the user name next to the message
            showUserName = previousMessage.name !== message.name && !isNotification;
            message.showUser = showUserName;

            this.processMessage(message, roomName);

            if (showUserName === false) {
                previousMessage.element.addClass('continue');
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

                this.addMessage(model, 'postedNotification', roomName);
            } else {
                this.appendMessage(templates.message.plain.tmpl(message), room);

                // TODO Message Ticker
                //if (!message.isMine && !message.isHistory && roomName != room.getName()) {
                //    MessageTicker.appendMessage(message, roomName);
                //}
            }

            if (message.htmlContent) {
                this.addChatMessageContent(message.id, message.htmlContent, room.getName());
            }

            // Trigger notification
            notifications.messageNotification(message, room);
        },
        
        appendMessage: function (newMessage, room) {
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
                    this.addMessage(this.dateHeaderFormat(thisDate), 'date-header list-header', room.getName())
                        .find('.right').remove(); // remove timestamp on date indicator
                }
            }

            if (isMessage) {
                room.updateMessages(true);
            }

            $(newMessage).appendTo(room.messages);
        },
        
        addMessage: function (content, type, roomName) {
            var room = roomName ? ru.getRoomElements(roomName) : ru.getCurrentRoomElements();

            if (room === null) {
                logger.warn('Room does not exist yet');
                return null;
            }

            var nearEnd = room.isNearTheEnd(),
                $element = this.prepareNotificationMessage(content, type);

            this.appendMessage($element, room);

            if (type === 'notification' && room.isLobby() === false) {
                this.collapseNotifications($element);
            }

            if (nearEnd) {
                ru.scrollToBottom(roomName);
            }

            return $element;
        },

        addChatMessageContent: function (id, content, roomName) {
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
        },

        addPrivateMessage: function (content, type) { logger.warn('addPrivateMessage not implemented'); },

        addMessageBeforeTarget: function (content, type, $target) { logger.warn('addMessageBeforeTarget not implemented'); },

        prependChatMessages: function (messages, roomName) { logger.warn('prependChatMessages not implemented'); },

        // #endregion
        
        // #region Send Message
        
        sendMessage: function (msg) { logger.warn('sendMessage not implemented'); },

        sendClientMessage: function (clientMessage, messageCompleteTimeout) { logger.warn('sendClientMessage not implemented'); },

        failPendingMessages: function () {
            for (var id in this.pendingMessages) {
                if (this.pendingMessages.hasOwnProperty(id)) {
                    clearTimeout(this.pendingMessages[id]);
                    this.failMessage(id);
                    delete this.pendingMessages[id];
                }
            }
        },

        // #endregion
        
        // #region Notifications
        
        prepareNotificationMessage: function (options, type) {
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

            return templates.message.notification.tmpl(message);
        },

        // #endregion

        setMessageReadState: function (mid, read) { logger.warn('setMessageReadState not implemented'); },

        dateHeaderFormat: function (date) {
            return moment(date).format('dddd, MMMM Do YYYY');
        },
        
        historyPush: function (type, clientMessage) {
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
        },
        
        changeMessageId: function (oldId, newId) {
            for (var roomName in rc.messageHistory) {
                for (var i = 0; i < rc.messageHistory[roomName].length; i++) {
                    if (rc.messageHistory[roomName][i].id == oldId) {
                        rc.messageHistory[roomName][i].id = newId;
                        rc.messageHistory[roomName][i].replaced = true;
                        return;
                    }
                }
            }
        },
        
        // #region Chat Hub Handlers

        handlers: {
            bind: function (messages) {
                this.messages = messages;
                
                client.chat.client.addMessage = $.proxy(this.addMessage, this);
                client.chat.client.addMessageContent = $.proxy(this.addMessageContent, this);
                client.chat.client.replaceMessage = $.proxy(this.replaceMessage, this);
                client.chat.client.postMessage = $.proxy(this.addMessage, this);

                client.chat.client.sendMeMessage = $.proxy(this.sendMeMessage, this);
                client.chat.client.sendPrivateMessage = $.proxy(this.sendPrivateMessage, this);
                
                client.chat.client.messageReadStateChanged = $.proxy(this.messageReadStateChanged, this);
            },
            
            addMessage: function (message, room) {
                var viewModel = new Message(message),
                    edited = this.messages.messageExists(viewModel.id);

                ru.scrollIfNecessary($.proxy(function () {
                    // Update your message when it comes from the server
                    if (edited) {
                        this.messages.replaceMessageElement(viewModel);
                    } else {
                        this.messages.addChatMessage(viewModel, room);
                        ui.incrementMessageCount();
                    }
                }, this), room);

                var isMentioned = viewModel.highlight === 'highlight';

                if (!viewModel.isMine && !edited) {
                    events.trigger(events.ui.updateUnread, [room, isMentioned]);
                }
            },

            addMessageContent: function (id, content, room) {
                ru.scrollIfNecessary($.proxy(function () {
                    this.messages.addChatMessageContent(id, content, room);
                }, this), room);

                // isMentioned: this is outside normal messages and user shouldn't be mentioned
                events.trigger(events.ui.updateUnread, [room, false]);

                this.messages.watchMessageScroll([id], room);
            },

            replaceMessage: function (id, message, room) {
                this.messages.confirmMessage(id);

                var viewModel = new Message(message);

                ru.scrollIfNecessary($.proxy(function () {
                    // Update your message when it comes from the server
                    this.messages.overwriteMessage(id, viewModel);
                }, this), room);

                var isMentioned = viewModel.highlight === 'highlight';

                if (!viewModel.isMine) {
                    events.trigger(events.ui.updateUnread, [room, isMentioned]);
                }
            },

            sendMeMessage: function (name, message, room) {
                this.messages.addMessage('*' + name + ' ' + message, 'action', room);
            },

            sendPrivateMessage: function (from, to, message) {
                if (rc.isSelf({ Name: to })) {
                    // Force notification for direct messages
                    notifications.notifyMention(true);
                    this.messages.lastPrivate = from;
                }

                this.messages.addPrivateMessage('*' + from + '* *' + to + '* ' + message, 'pm');
            },
            
            messageReadStateChanged: function (mid, read) {
                logger.debug('messageReadStateChanged ' + mid + ' ' + read);
                this.messages.setMessageReadState(mid, read);
            }
        }
        
        // #endregion
    });
});