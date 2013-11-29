/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/messages',
        
    'jquery.tmpl'
], function ($, Logger, kernel, Messages) {
    var logger = new Logger('jabbr/mobile/components/messages'),
        ru = null,
        processor = null,
        templates = null;

    return Messages.extend({
        constructor: function () {
            this.base();
        },

        activate: function () {
            this.base();

            //client = kernel.get('jabbr/client');
            //ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            //rc = kernel.get('jabbr/components/rooms.client');
            //notifications = kernel.get('jabbr/components/notifications');
            processor = kernel.get('jabbr/messageprocessors/processor');
            templates = kernel.get('jabbr/templates');

            this.attach();
        },
        
        attach: function () {},

        addChatMessage: function (message, roomName) {
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

            this.processMessage(message, roomName);

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

                this.addMessage(model, 'postedNotification', roomName);
            } else {
                this.appendMessage(templates.message.plain.tmpl(message), room);
            }

            // TODO message content
            //if (message.htmlContent) {
            //    this.addChatMessageContent(message.id, message.htmlContent, room.getName());
            //}

            // Trigger notification
            // TODO notifications.messageNotification(message, room);
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
    });
});