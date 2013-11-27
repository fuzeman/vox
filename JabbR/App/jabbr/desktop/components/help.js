/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/help'
], function ($, Logger, kernel, Help) {
    var templates = null,
        $helpPopup = $('#jabbr-help'),
        $help = $('#preferences .help'),
        $helpBody = $('#jabbr-help .help-body'),
        $shortCutHelp = $('#jabbr-help #shortcut'),
        $globalCmdHelp = $('#jabbr-help #global'),
        $roomCmdHelp = $('#jabbr-help #room'),
        $userCmdHelp = $('#jabbr-help #user'),
        help = {
            shortcut: 'shortcut',
            global: 'global',
            room: 'room',
            user: 'user'
        };

    return Help.extend({
        constructor: function () {
            this.base();

            this.helpHeight = 0;
        },

        activate: function () {
            this.base();
            
            templates = kernel.get('jabbr/templates');

            this.attach();
        },
        
        attach: function () {
            $help.click(this.show);
            
            // hack to get Chrome to scroll back to top of help body
            // when redisplaying it after scrolling down and closing it
            $helpPopup.on('hide', function () {
                $helpBody.scrollTop(0);
            });

            // set the height of the help body when displaying the help dialog
            // so that the scroll bar does not block the rounded corners
            $helpPopup.on('show', $.proxy(function () {
                if (this.helpHeight === 0) {
                    this.helpHeight = $helpPopup.height() - $helpBody.position().top - 10;
                }
                $helpBody.css('height', this.helpHeight);
            }, this));
        },

        updateCommands: function () {
            $globalCmdHelp.empty();
            $roomCmdHelp.empty();
            $userCmdHelp.empty();

            $.each(this.commands, function () {
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
        },
        
        updateShortcuts: function () {
            $shortCutHelp.empty();

            $.each(this.shortcuts, function () {
                $shortCutHelp.append(templates.commandhelp.tmpl(this));
            });
        },
        
        show: function () {
            $helpPopup.modal();
        }
    });
});