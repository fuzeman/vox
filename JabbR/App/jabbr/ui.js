define([
    'jabbr/state',
    'jabbr/client',
    'jabbr/components/rooms.ui',
    'jabbr/utility',
    'logger'
], function (state, client, ru, utility, Logger) {
    var logger = new Logger('jabbr/ui');
    logger.trace('loaded');
    
    var $window = $(window),
        $hiddenFile = $('#hidden-file'),
        $submitButton = $('#send'),
        $newMessage = $('#new-message'),
        $fileUploadButton = $('.upload-button');

    var readOnly = false,
        focus = true;
    
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

    //
    // Event Handlersl
    //
    
    // Room

    ru.bind(ru.events.activateRoom, function(event, activateRoom) {
        toggleMessageSection(activateRoom.isClosed());
    });

    ru.bind(ru.events.focus, function() {
        triggerFocus();
    });

    // Client
    
    client.bind(client.events.connected, function(event, change, initial) {
        if (!initial) {
            setReadOnly(false);
        }
    });

    client.bind(client.events.disconnected, function() {
        setReadOnly(true);
    });

    client.bind(client.events.logOn, function (event, currentRooms) {
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
        }
        else {
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

    return {
    }
});