define([
    'jabbr/components/rooms.client',
    'jabbr/templates',
    'jabbr/utility',
        
    'jquery.fancybox'
], function (rc, templates, utility) {
    var ru = null;

    function addChatMessage(message, roomName) {
        var room = ru.getRoomElements(roomName),
            $previousMessage = room.messages.children().last(),
            previousUser = null,
            previousTimestamp = new Date().addDays(1), // Tomorrow so we always see a date line
            showUserName = true,
            $message = null,
            isMention = message.highlight,
            notify = rc.getRoomPreference(roomName, 'notify') || 'mentions',
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

            ui.addMessage(model, 'postedNotification', roomName);
        }
        else {
            appendMessage(templates.message.tmpl(message), room);

            // TODO: Add message to ticker
            /*if (!message.isMine && !message.isHistory && roomName != currentRoomName) {
                messageTicker.appendMessage(message, roomName);
            }*/
        }

        if (message.htmlContent) {
            addChatMessageContent(message.id, message.htmlContent, room.getName());
        }

        var roomFocus = roomName == currentRoomName && focus;

        if (room.isInitialized()) {
            if (isMention) {
                // Mention Sound
                if (roomFocus === false && getRoomPreference(roomName, 'hasSound') === true) {
                    ui.notify(true);
                }
                // Mention Popup
                if (roomFocus === false && getRoomPreference(roomName, 'canToast') === true) {
                    ui.toast(message, true, roomName);
                }
            } else if (notify == 'all') {
                // All Sound
                if (roomFocus === false && getRoomPreference(roomName, 'hasSound') === true) {
                    ui.notifyRoom(roomName);
                }
                // All Popup
                if (roomFocus === false && getRoomPreference(roomName, 'canToast') === true) {
                    ui.toastRoom(roomName, message);
                }
            }
        }
    }
    
    function addChatMessageContent(id, content, roomName) {
        var $message = $('#m-' + id),
            $middle = $message.find('.middle'),
            $body = $message.find('.content');

        if (shouldCollapseContent(content, roomName)) {
            content = collapseRichContent(content);
        }

        if ($middle.length === 0) {
            $body.append('<p>' + content + '</p>');
        }
        else {
            $middle.append(processRichContent($(content)));
        }
            
        // Fancybox
        $('a.imageContent', $middle).fancybox({
            openEffect: 'elastic',
            openSpeed: 400,
                
            closeEffect: 'elastic',
            closeSpeed: 200,
                
            helpers: {
                overlay: {
                    closeClick: true
                }
            }
        });
    }

    function processMessage(message, roomName) {
        var isFromCollapibleContentProvider = isFromCollapsibleContentProvider(message.message),
            collapseContent = shouldCollapseContent(message.message, roomName);

        message.when = message.date.formatTime(true);
        message.fulldate = message.date.toLocaleString();

        if (!message.isHistory) {
            message.message = processItalics(message.message);
        }

        if (collapseContent) {
            message.message = collapseRichContent(message.message);
        }
    }
    
    function processItalics(content) {
        var re = /(?:\*|_)([^\*_]*)(?:\*|_)/g,
            match = null,
            result = content;

        //Replaces *test* occurrences in message with <i>test</i> so you can use italics
        while ((match = re.exec(result)) != null) {
            if (match[1].length > 0) {
                var head = result.substring(0, match.index);
                var tail = result.substring(match.index + match[0].length, result.length);
                result = head + "<i>" + match[1] + "</i>" + tail;
            }
        }

        return result;
    }
    
    function isFromCollapsibleContentProvider(content) {
        return content.indexOf('class="collapsible_box') > -1; // leaving off trailing " purposefully
    }

    function shouldCollapseContent(content, roomName) {
        var collapsible = isFromCollapsibleContentProvider(content),
            collapseForRoom = roomName ? rc.getRoomPreference(roomName, 'blockRichness') : ru.getActiveRoomPreference('blockRichness');

        return collapsible && collapseForRoom;
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
    
    function prepareNotificationMessage(options, type) {
        if (typeof options === 'string') {
            options = { content: options, encoded: false };
        }

        var now = new Date(),
        message = {  // TODO: use jabbr/viewmodels/message ?
            message: options.encoded ? options.content : processContent(options.content),
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
    
    function processContent(content) {
        return utility.processContent(content, templates, ru.roomCache);
    }
    
    function processRichContent($content) {
        // TODO: A bit of a dirty hack, Maybe this could be done another way?
        var $plexrResult = $("PlexrContentProviderResult", $content);

        if ($plexrResult.length == 1) {
            var result = processPlexrContentResult($plexrResult);
            if (result !== null) {
                $("PlexrContentProviderResult", $content).replaceWith(result);
                var curMusicService = rc.getPreference('music_service');
                $('.collapsible_title', $content).text(
                    curMusicService.charAt(0).toUpperCase() + curMusicService.slice(1) +
                    ' (Plexr) (click to show/hide)');
            } else {
                return null;
            }
            return $content;
        } else {
            return $content;
        }
    }
    
    function processPlexrContentResult($plexrResult) {
        var preferredMusicService = rc.getPreference('music_service');
        var $serviceDetails = $plexrResult.find(preferredMusicService);

        if (preferredMusicService == 'spotify') {
            return "<iframe src=\"https://embed.spotify.com/?uri=" + $serviceDetails.text() + "\" width=\"300\" height=\"380\" " +
                    "frameborder=\"0\" allowtransparency=\"true\"></iframe>";
        } else if (preferredMusicService == 'rdio') {
            return "<iframe width=\"500\" height=\"250\" src=\"https://rd.io/i/" + $serviceDetails.text() + "//?source=oembed\" " +
                    "frameborder=\"0\"></iframe>";
        }
        return null;
    }
    
    function collapseRichContent(content) {
        content = content.replace(/class="collapsible_box/g, 'style="display: none;" class="collapsible_box');
        return content.replace(/class="collapsible_title"/g, 'class="collapsible_title" title="Content collapsed because you have Rich-Content disabled"');
    }

    function collapseNotifications($notification) {
        // collapse multiple notifications
        var $notifications = $notification.prevUntil(':not(.notification)');
        if ($notifications.length > 3) {
            $notifications
                .hide()
                .find('.info').text('');    // clear any prior text
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

        var room = getCurrentRoomElements(),
            topAfter = $notification.position().top,
            scrollTop = room.messages.scrollTop();

        // make sure last notification is visible
        room.messages.scrollTop(scrollTop + topAfter - topBefore + $notification.height());
    }

    return {
        initialize: function(roomUi) {
            ru = roomUi;
        },

        addChatMessage: addChatMessage,
        addMessage: addMessage
    }
});