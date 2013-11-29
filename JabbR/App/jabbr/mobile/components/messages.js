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