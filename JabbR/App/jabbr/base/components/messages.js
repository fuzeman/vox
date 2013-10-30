define([
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/viewmodels/message',
    'jabbr/core/messageprocessors/collapse'
], function (Logger, kernel, EventObject, Message, collapse) {
    var logger = new Logger('jabbr/components/messages'),
        ru = null,
        rc = null;

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.lastPrivate = null;
            this.pendingMessages = {};

            kernel.bind('jabbr/components/messages', this);
        },

        activate: function () {
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');

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

        addChatMessage: function (message, roomName) { logger.warn('addChatMessage not implemented'); },
        
        appendMessage: function (newMessage, room) { logger.warn('appendMessage not implemented'); },
        
        addMessage: function (content, type, roomName) { logger.warn('addMessage not implemented'); },

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
                    notifications.notify(true);
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