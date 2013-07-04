define(['jabbr/state', 'jabbr/client'], function(state, client) {
    console.log('[jabbr/ui]');
    
    var $hiddenFile = $('#hidden-file'),
        $submitButton = $('#send'),
        $newMessage = $('#new-message'),
        $fileUploadButton = $('.upload-button');

    var readOnly = false;
    
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
    
    client.bind(client.events.connected, function (event, change, initial) {
        if (!initial) {
            setReadOnly(false);
        }
    });
    
    client.bind(client.events.disconnected, function () {
        setReadOnly(true);
    });

});