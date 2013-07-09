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
            currentShortcuts = null,
            currentCommands = null,
            help = {
                shortcut: 'shortcut',
                global: 'global',
                room: 'room',
                user: 'user'
            };

        function clientLoggedOn() {
            client.chat.server.getCommands().done(function (commands) {
                currentCommands = commands;
                logger.trace("loaded " + commands.length + " commands");
            });

            client.chat.server.getShortcuts().done(function (shortcuts) {
                currentShortcuts = shortcuts;
                logger.trace("loaded " + shortcuts.length + " shortcuts");
            });
        }

        function show() {
            $shortCutHelp.empty();
            $globalCmdHelp.empty();
            $roomCmdHelp.empty();
            $userCmdHelp.empty();
            $.each(currentCommands, function () {
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
            $.each(currentShortcuts, function () {
                $shortCutHelp.append(templates.commandhelp.tmpl(this));
            });
            $helpPopup.modal();
        }

        //
        // DOM Event Handlers
        //

        $help.click(function () {
            show();
        });

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');

                logger.trace('activated');

                client.bind(events.client.loggedOn, clientLoggedOn);

                client.chat.client.showCommands = function () {
                    show();
                };
            },

            show: show
        }
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/help', object);
        }

        return object;
    };
});