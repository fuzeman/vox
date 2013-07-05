define([
    'jabbr/state',
    'jabbr/client',
    'jabbr/models/user',
    'jabbr/components/room.ui',
    'jabbr/utility'
], function (state, client, user, room, utility) {
    console.log('[jabbr/ui]');
    
    var $hiddenFile = $('#hidden-file'),
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
    // Event Handlers
    //
    
    // Room

    room.bind(room.events.activateRoom, function(event, activateRoom) {
        toggleMessageSection(activateRoom.isClosed());
    });

    room.bind(room.events.focusRoom, function() {
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

    client.bind(client.events.logOn, function (event, rooms) {
        room.addRooms(rooms);

        room.openRoomFromHash();

        room.setActiveRoom(state.get().activeRoom || 'Lobby');
    });
    
    return {
    }
});