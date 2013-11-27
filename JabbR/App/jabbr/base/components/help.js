/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object'
], function ($, Logger, kernel, EventObject) {
    var logger = new Logger('jabbr/components/help'),
        client = null;

    return EventObject.extend({        
        constructor: function () {
            this.base();

            this.shortcuts = null;
            this.commands = null;

            kernel.bind('jabbr/components/help', this);
        },

        activate: function () {
            client = kernel.get('jabbr/client');

            logger.trace('activated');
            
            client.chat.client.showCommands = this.show;
        },
        
        show: function() { logger.warn('show not implemented'); },
        
        load: function () {
            client.chat.server.getCommands().done($.proxy(function (currentCommands) {
                this.commands = currentCommands;
                this.updateCommands();

                logger.trace("loaded " + this.commands.length + " commands");
            }, this));

            client.chat.server.getShortcuts().done($.proxy(function (currentShortcuts) {
                this.shortcuts = currentShortcuts;
                this.updateShortcuts();
                
                logger.trace("loaded " + this.shortcuts.length + " shortcuts");
            }, this));
        },
        
        updateCommands: function () { logger.warn('updateCommands not implemented'); },
        
        updateShortcuts: function () { logger.warn('updateShortcuts not implemented'); }
    });
});