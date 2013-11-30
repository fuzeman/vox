﻿/*global define, document, window, clearTimeout, moment*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/messages',
    'jabbr/core/utility',
    'jabbr/core/events',
    'jabbr/desktop/components/message-ticker'
], function (
    $, Logger, kernel, Messages,
    utility, events, MessageTicker
) {
    var logger = new Logger('jabbr/desktop/components/messages'),
        client = null,
        ui = null,
        ru = null,
        rc = null,
        notifications = null,
        processor = null,
        templates = null,
        $document = $(document),
        messageSendingDelay = 1500;

    return Messages.extend({
        constructor: function () {
            this.base();
        },
        
        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            notifications = kernel.get('jabbr/components/notifications');
            processor = kernel.get('jabbr/messageprocessors/processor');
            templates = kernel.get('jabbr/templates');

            this.attach();
        },
        
        attach: function () {
            // handle click on notifications
            $document.on('click', '.notification a.info', $.proxy(function () {
                var $notification = $(this).closest('.notification');

                if ($(this).hasClass('collapse')) {
                    this.collapseNotifications($notification);
                } else {
                    this.expandNotifications($notification);
                }
            }, this));
        },

        // #region Add Message
        
        addPrivateMessage: function (content, type) {
            var rooms = ru.getAllRoomElements();
            for (var r in rooms) {
                if (rooms[r].getName() !== undefined && rooms[r].isClosed() === false) {
                    this.addMessage(content, type, rooms[r].getName());
                }
            }
        },
        
        addMessageBeforeTarget: function (content, type, $target) {
            var $element = this.prepareNotificationMessage(content, type);
            $target.before($element);

            return $element;
        },

        prependChatMessages: function (messages, roomName) {
            var _this = this,
                room = rc.getRoom(roomName),
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
                _this.processMessage(this, roomName);

                if ($previousMessage) {
                    previousUser = $previousMessage.data('name');
                    previousTimestamp = new Date($previousMessage.data('timestamp') || new Date());
                }

                if (this.date.toDate().diffDays(previousTimestamp.toDate())) {
                    _this.addMessageBeforeTarget(_this.dateHeaderFormat(this.date), 'list-header', $target)
                      .addClass('date-header')
                      .find('.right').remove(); // remove timestamp on date indicator

                    // Force a user name to show after the header
                    previousUser = null;
                }

                // Determine if we need to show the user
                this.showUser = !previousUser || previousUser !== this.name;

                // Render the new message
                $target.before(templates.message.plain.tmpl(this));

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
        },

        overwriteMessage: function (id, message) {
            var $message = $('#m-' + id);
            this.processMessage(message);

            $message.find('.middle').html(message.message);
            $message.find('.right .time').attr('title', message.fulldate).text(message.when);
            $message.attr('id', 'm-' + message.id);

            this.changeMessageId(id, message.id);
        },
        
        replaceMessageElement: function (message) {
            this.processMessage(message);

            $('#m-' + message.id).find('.middle')
                                 .html(message.message);
        },

        messageExists: function (id) {
            return $('#m-' + id).length > 0;
        },

        failMessage: function (id) {
            $('#m-' + id).removeClass('loading')
                         .addClass('failed');
        },

        markMessagePending: function (id) {
            var $message = $('#m-' + id);

            if ($message.hasClass('failed') === false) {
                $message.addClass('loading');
            }
        },

        // #endregion
        
        // #region Send Message

        sendMessage: function (msg) {
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
                    this.addMessage('You cannot send messages within the Lobby', 'error');
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
                    this.addChatMessage(viewModel, clientMessage.room);
                    ui.incrementMessageCount();
                } else {
                    this.replaceMessageElement(viewModel);
                }

                // If there's a significant delay in getting the message sent
                // mark it as pending
                messageCompleteTimeout = window.setTimeout(function () {
                    if ($.connection.hub.state === $.connection.connectionState.reconnecting) {
                        this.failMessage(id);
                    } else {
                        // If after a second
                        this.markMessagePending(id);
                    }
                },
                    messageSendingDelay);

                this.pendingMessages[id] = messageCompleteTimeout;
            }

            rc.historyLocation = 0;

            this.sendClientMessage(clientMessage, messageCompleteTimeout);
            this.historyPush(type, clientMessage);
        },
        
        sendClientMessage: function (clientMessage, messageCompleteTimeout) {
            var _this = this;

            try {
                client.chat.server.send(clientMessage)
                    .done(function () {
                        if (messageCompleteTimeout) {
                            clearTimeout(messageCompleteTimeout);
                            delete _this.pendingMessages[clientMessage.id];
                        }

                        _this.confirmMessage(clientMessage.id);
                    })
                    .fail(function (e) {
                        _this.failMessage(clientMessage.id);
                        
                        if (e.source === 'HubException') {
                            _this.addMessage(e.message, 'error');
                        }
                    });
            } catch (e) {
                client.connection.hub.log('Failed to send via websockets');

                clearTimeout(this.pendingMessages[clientMessage.id]);
                this.failMessage(clientMessage.id);
            }
        },
        
        // #endregion
        
        watchMessageScroll: function (messageIds, roomName) {
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
        },

        confirmMessage: function (id) {
            $('#m-' + id).removeClass('failed')
                         .removeClass('loading');
        },

        // #region Notifications
        
        collapseNotifications: function ($notification) {
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
        },

        expandNotifications: function ($notification) {
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
        },

        // #endregion
        
        setMessageReadState: function (mid, read) {
            var cur = $('#m-' + mid + ' .left .state a.read');

            if (read) {
                cur.remove();
            } else {
                if (cur.length === 0) {
                    var $readButton = $('<a href="#" class="read"><i class="icon-ok-circle"></i></a>');
                    $readButton.click(this.messageReadClick);

                    $('#m-' + mid + ' .left .state').append($readButton);
                }
            }
        },

        messageReadClick: function () {
            var message = $(this).closest('.message'),
                mid = message.attr('id').substring(2);

            if (mid !== undefined) {
                client.chat.server.setMessageReadState(mid, true);
            }
        }
    });
});