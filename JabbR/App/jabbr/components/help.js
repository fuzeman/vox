/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events',
    'jabbr/templates'
], function ($, Logger, kernel, events, templates) {
    var logger = new Logger('jabbr/components/help'),
        client = null,
        ui = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $shortCutHelp = $('#jabbr-help #shortcut'),
            $globalCmdHelp = $('#jabbr-help #global'),
            $roomCmdHelp = $('#jabbr-help #room'),
            $userCmdHelp = $('#jabbr-help #user'),
            $helpPopup = $('#jabbr-help'),
            $help = $('#preferences .help'),
            $helpBody = $('#jabbr-help .help-body'),
            shortcuts = null,
            commands = null,
            helpHeight = 0,
            help = {
                shortcut: 'shortcut',
                global: 'global',
                room: 'room',
                user: 'user'
            };

        function load() {
            client.chat.server.getCommands().done(function (currentCommands) {
                commands = currentCommands;
                
                $globalCmdHelp.empty();
                $roomCmdHelp.empty();
                $userCmdHelp.empty();

                $.each(commands, function () {
                    switch (this.Group) {
                        case help.shortcut:
                            $shortCutHelp.append(templates.commandhelp.tmpl(this));
                            break;
                        case help.global:
                            $globalCmdHelp.append(templates.commandhelp.tmpl(this));
                            break;
                        case help.room:
                            $roomCmdHelp.append(templates.commandhelp.tmpl(this));
                            break;
                        case help.user:
                            $userCmdHelp.append(templates.commandhelp.tmpl(this));
                            break;
                    }
                });

                logger.trace("loaded " + commands.length + " commands");
            });

            client.chat.server.getShortcuts().done(function (currentShortcuts) {
                shortcuts = currentShortcuts;
                $shortCutHelp.empty();

                $.each(shortcuts, function () {
                    $shortCutHelp.append(templates.commandhelp.tmpl(this));
                });

                logger.trace("loaded " + shortcuts.length + " shortcuts");
            });
        }

        function show() {
            $helpPopup.modal();
        }

        //
        // DOM Event Handlers
        //

        $help.click(show);

        // hack to get Chrome to scroll back to top of help body
        // when redisplaying it after scrolling down and closing it
        $helpPopup.on('hide', function () {
            $helpBody.scrollTop(0);
        });

        // set the height of the help body when displaying the help dialog
        // so that the scroll bar does not block the rounded corners
        $helpPopup.on('show', function () {
            if (helpHeight === 0) {
                helpHeight = $helpPopup.height() - $helpBody.position().top - 10;
            }
            $helpBody.css('height', helpHeight);
        });

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');

                logger.trace('activated');

                client.chat.client.showCommands = show;
            },

            getCommands: function () {
                return commands;
            },
            getShortcuts: function () {
                return shortcuts;
            },

            show: show,
            load: load
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/help', object);
        }

        return object;
    };
});