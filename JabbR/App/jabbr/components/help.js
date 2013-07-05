define([
    'jabbr/client',
    'jabbr/ui',
    'logger'
], function (client, ui, Logger) {
    var logger = new Logger('jabbr/components/help');
    logger.trace('loaded');

    client.chat.server.getCommands().done(function(commands) {
        logger.trace("loaded " + commands.length + " commands");
    });

    client.chat.server.getShortcuts().done(function(shortcuts) {
        logger.trace("loaded " + shortcuts.length + " shortcuts");
    });
});