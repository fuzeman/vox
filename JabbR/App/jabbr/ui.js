/*global define, document*/
define([
    'jquery',
    'jabbr/state',
    'jabbr/client',
    'jabbr/events',
    'jabbr/components/rooms.ui',
    'jabbr/utility',
    'logger'
], function ($, state, client, events, ru, utility, Logger) {
    var logger = new Logger('jabbr/ui');
    logger.trace('loaded');

    var $window = $(window),
        $hiddenFile = $('#hidden-file'),
        $submitButton = $('#send'),
        $newMessage = $('#new-message'),
        $fileUploadButton = $('.upload-button');

    var readOnly = false,
        focus = true,
        originalTitle = document.title,
        unread = 0,
        isUnreadMessageForUser = false,
        newMessageLines = 1;

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
                ui.showLogin();
            } else {
                if (id === undefined) {
                    ru.messages.sendMessage(msg);
                } else {
                    ru.messages.sendMessage({ content: msg, id: id });
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

    //
    // Event Handlers
    //

    events.bind(events.ui.clearUnread, clearUnread);
    events.bind(events.ui.updateUnread, updateUnread);
    events.bind(events.ui.updateTitle, updateTitle);

    // Room

    ru.bind(events.rooms.ui.activateRoom, function (event, activateRoom) {
        toggleMessageSection(activateRoom.isClosed());
    });

    // Client

    client.bind(events.client.connected, function (event, change, initial) {
        if (!initial) {
            setReadOnly(false);
        }
    });

    client.bind(events.client.disconnected, function () {
        setReadOnly(true);
    });

    client.bind(events.client.loggedOn, function (event, currentRooms) {
        ru.addRooms(currentRooms);

        // Process any urls that may contain room names
        ru.openRoomFromHash();

        // Otherwise set the active room
        ru.setActiveRoom(state.get().activeRoom || 'Lobby');

        var loadRooms = function () {
            $.each(currentRooms, function (index, loadRoom) {
                if (client.chat.state.activeRoom !== loadRoom.Name) {
                    ru.client.populateRoom(loadRoom.Name);
                }
            });
        };

        // Populate lobby rooms for intellisense
        ru.lobby.updateRooms();

        if (state.get().activeRoom) {
            // Always populate the active room first then load the other rooms so it looks fast :)
            ru.client.populateRoom(state.get().activeRoom).done(loadRooms);
        } else {
            // There's no active room so we don't care
            loadRooms();
        }
    });

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

    return {
    };
});