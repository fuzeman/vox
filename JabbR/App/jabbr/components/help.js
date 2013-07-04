define(['jabbr/client', 'jabbr/ui'], function(client, ui) {
    console.log('[jabbr/components/help]');

    client.chat.server.getCommands().done(function(commands) {
        console.log(commands);
    });
});