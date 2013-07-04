define([
    'jquery',    
    'jquery.cookie',
    'jquery.signalr',
    'noext!signalr/hubs'
], function($) {
    console.log('[jabbr/client]');

    var connection = $.connection,
        chat = connection.chat,
        logging = $.cookie('jabbr.logging') === '1',
        transport = $.cookie('jabbr.transport'),
        options = {};

    if (transport) {
        options.transport = transport;
    }

    connection.hub.logging = logging;
    connection.hub.qs = "version=" + window.jabbrVersion;

    return {
        chat: chat,

        start: function(callback) {
            connection.hub.start(options).done(function() {
                chat.server.join().fail(function(e) {
                    console.log('[jabbr/client] join failed');
                }).done(function() {
                    callback();
                });
            });
        }
    }
});