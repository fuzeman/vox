/*global define, window, document, setTimeout, setInterval, clearInterval*/
define([
    'jquery',
    'kernel',
    'keys',
    'jabbr/base/ui',
    'jabbr/desktop/components/connection-status',
    'jabbr/desktop/components/rooms.ui',
    'jabbr/desktop/components/help',
    'jabbr/desktop/components/client-settings',
    'jabbr/desktop/templates',
    'jabbr/core/components/emoji',
    'jabbr/core/components/external-status',
    'jabbr/core/utility',

    'jquery.autotabcomplete',
    'livestamp'
], function ($, kernel, Keys, UI,
    connectionStatus, DesktopRoomsUI, DesktopHelp, cs, templates,
    emoji, externalStatus, utility
) {
    var client = null,
        ru = null,
        rc = null,
        lobby = null,
        messages = null,
        help = null,
        $updatePopup = $('#jabbr-update'),
        $messageTotal = $('#message-total'),
        $hiddenFile = $('#hidden-file'),
        $submitButton = $('#send'),
        $newMessage = $('#new-message'),
        $fileUploadButton = $('.upload-button'),
        $roomFilterInput = $('#room-filter'),
        $logout = $('#preferences .logout'),
        $lobbyWrapper = $('#lobby-wrapper'),
        $sendMessage = $('#send-message'),
        $tabs = $('#tabs');

    return UI.extend({
        constructor: function () {
            this.base();

            this.newMessageLines = 1;
            this.lastCycledMessage = null;
            this.updateTimeout = 15000;

            connectionStatus = connectionStatus();
            cs = cs();
            externalStatus = externalStatus();
            templates = templates();

            this.submodules = {
                connectionStatus: connectionStatus,
                ru: new DesktopRoomsUI(),
                help: new DesktopHelp(),
                cs: cs,
                externalStatus: externalStatus
            };
        },

        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ru = kernel.get('jabbr/components/rooms.ui');
            rc = kernel.get('jabbr/components/rooms.client');
            lobby = kernel.get('jabbr/components/lobby');
            messages = kernel.get('jabbr/components/messages');
            help = kernel.get('jabbr/components/help');


            $newMessage.keypress($.proxy(this._newMessage.keypress, this))
                       .keydown($.proxy(this._newMessage.keydown, this))
                       .bind('paste', $.proxy(this._newMessage.paste, this));

            $newMessage.autoTabComplete({
                prefixMatch: '[a-z@#/:]',
                get: $.proxy(this._newMessage.getTabComplete, this)
            });

            $submitButton.click($.proxy(this._submitClick, this));

            $logout.click($.proxy(this._logout.click, this));

            $(document).on('click', '.users li.user .name', $.proxy(this.prepareMessage, this))
                       .on('click', '.message .left .name', $.proxy(this.prepareMessage, this))
                       .on('keydown', $.proxy(this._document.keydown, this));


            // Configure livestamp to only update every 30s since display
            // granularity is by minute anyway (saves CPU cycles)
            $.livestamp.interval(30 * 1000);
        },

        _windowKeyFocus: function (ev) {
            if (!$newMessage.is(':focus') &&
                    !$roomFilterInput.is(':focus') &&
                    !cs.isOpen() &&
                    !ev.ctrlKey &&
                    !ev.altKey) {
                $newMessage.focus();
            }
        },

        _submitClick: function (ev) {
            this.triggerSend();

            ev.preventDefault();
            return false;
        },

        _newMessage: {
            keypress: function (ev) {
                var key = ev.keyCode || ev.which;

                switch (key) {
                    case Keys.Up:
                    case Keys.Down:
                    case Keys.Esc:
                        break;
                    case Keys.Enter:
                        if (ev.shiftKey) {
                            this.triggerTyping();
                        } else {
                            this.triggerSend();
                            ev.preventDefault();
                        }
                        break;
                    default:
                        if ($newMessage.val()[0] === '/' || key === Keys.Slash) {
                            return;
                        }
                        this.triggerTyping();
                        break;
                }
            },

            keydown: function (ev) {
                var key = ev.keyCode || ev.which;

                switch (key) {
                    case Keys.Up:
                        if (($newMessage.val() === '' || $newMessage.hasClass('editing')) &&
                            this.cycleMessage('prev')) {
                            ev.preventDefault();
                        }
                        break;

                    case Keys.Down:
                        if (($newMessage.val() === '' || $newMessage.hasClass('editing')) &&
                            this.cycleMessage('next')) {
                            ev.preventDefault();
                        }
                        break;

                    case Keys.Esc:
                        $newMessage.val('');
                        this.newMessageLines = 1;
                        this.updateNewMessageSize();
                        if ($newMessage.attr('message-id') !== undefined) {
                            $('#m-' + $newMessage.attr('message-id')).removeClass('editing');
                            $newMessage.removeAttr('message-id');
                        }
                        $newMessage.removeClass('editing');
                        break;

                    case Keys.Backspace:
                        setTimeout($.proxy(function () {
                            this.newMessageLines = $newMessage.val().split('\n').length;
                            this.updateNewMessageSize();
                        }, this), 100);
                        break;

                    case Keys.Space:
                        // Check for "/r " to reply to last private message
                        if ($newMessage.val() === "/r" && messages.lastPrivate) {
                            this.setMessage("/msg " + messages.lastPrivate);
                        }
                        break;
                }
            },

            paste: function () {
                setTimeout($.proxy(function () {
                    this.newMessageLines = $newMessage.val().split('\n').length;
                    this.updateNewMessageSize();
                }, this), 100);
            },

            getTabComplete: function (prefix) {
                var room = ru.getCurrentRoomElements();

                switch (prefix) {
                    case '@':
                        // exclude current username from autocomplete
                        return room.users.find('li[data-name != "' + client.chat.state.name + '"]')
                            .not('.room')
                            .map(function () {
                                if ($(this).data('name')) {
                                    return $(this).data('name') + ' ';
                                }

                                return '';
                            })
                            .sort(function (a, b) {
                                return a.toString().toUpperCase().localeCompare(b.toString().toUpperCase());
                            });
                    case '#':
                        return lobby.getRooms()
                            .map(function (room) { return room.Name + ' '; });
                    case '/':
                        return help.commands
                            .map(function (cmd) { return cmd.Name + ' '; });
                    case ':':
                        return emoji.getIcons();
                    default:
                        // exclude current username from autocomplete
                        return $.grep(room.users.find('li[data-name != "' + client.chat.state.name + '"]')
                            .not('.room')
                            .map(function () {
                                var mention = $(this).data('mention');

                                if (mention !== undefined && mention !== null &&
                                    mention[0] == prefix.toLowerCase()) {
                                    return (mention.substr(1) + ' ' || "").toString();
                                }
                                
                                return "";
                            }), function (s) { return s.length !== 0; });
                }
            }
        },

        _logout: {
            click: function () {
                client.performLogout();
            }
        },

        _document: {
            keydown: function (ev) {
                // ctrl + tab event is sent to the page in firefox when the user probably means to change browser tabs
                if (ev.keyCode === Keys.Tab && $newMessage.val() === "" && !ev.ctrlKey) {
                    var current = ru.getCurrentRoomElements(),
                        index = current.tab.index(),
                        tabCount = $tabs.children().length - 1;

                    if (!ev.shiftKey) {
                        // Next tab
                        index = index % tabCount + 1;
                    } else {
                        // Prev tab
                        index = (index - 1) || tabCount;
                    }

                    rc.setActiveRoom($tabs.children().eq(index).data('name'));
                    if (!this.readOnly) {
                        $newMessage.focus();
                    }

                    ev.preventDefault();
                }

                if (!$newMessage.is(':focus') && ev.shiftKey && ev.keyCode === Keys.Question) {
                    help.show();
                    // Prevent the ? be recorded in the message box
                    ev.preventDefault();
                }
            }
        },


        triggerSend: function () {
            if (this.readOnly) {
                return;
            }

            var id = $newMessage.attr('message-id'),
                msg = $.trim($newMessage.val());

            this.base(id, msg);

            $newMessage.focus();
        },

        updateNewMessageSize: function () {
            $sendMessage.height(20 + (20 * this.newMessageLines));
            $newMessage.height(20 * this.newMessageLines);

            // Update Lobby
            $lobbyWrapper.css('bottom', 30 + (20 * this.newMessageLines));

            // Update Current Room
            var room = ru.getCurrentRoomElements();
            room.messages.css('bottom', 20 + (20 * this.newMessageLines));
            room.users.css('bottom', 30 + (20 * this.newMessageLines));
        },

        setMessageCount: function (count) {
            $messageTotal.text(utility.formatNumber(count));
        },

        triggerFocus: function () {
            if (!utility.isMobile && !this.readOnly) {
                $newMessage.focus();
            }

            this.base();
        },

        showUpdatePopup: function () {
            $updatePopup.modal();

            window.setTimeout($.proxy(function () {
                // Reload the page
                document.location = document.location.pathname;
            }, this), this.updateTimeout);
        },

        nudgeMove: function (x, y) {
            parent.moveBy(x, y);
        },

        nudgeShake: function (n) {
            var i, j;

            for (i = n; i > 0; i -= 1) {
                for (j = 1; j > 0; j -= 1) {
                    this.nudgeMove(i, 0);
                    this.nudgeMove(0, -i);
                    this.nudgeMove(-i, 0);
                    this.nudgeMove(0, i);
                    this.nudgeMove(i, 0);
                    this.nudgeMove(0, -i);
                    this.nudgeMove(-i, 0);
                    this.nudgeMove(0, i);
                    this.nudgeMove(i, 0);
                    this.nudgeMove(0, -i);
                    this.nudgeMove(-i, 0);
                    this.nudgeMove(0, i);
                }
            }
        },

        nudge: function (from, to) {
            $("#chat-area").pulse({ opacity: 0 }, { duration: 300, pulses: 3 });

            window.setTimeout($.proxy(function () {
                this.nudgeShake(20);
            }, this), 300);

            messages.addMessage('*' + from + ' nudged ' + (to ? 'you' : 'the room'), to ? 'pm' : 'notification');
        },

        // handle click on names in chat / room list
        prepareMessage: function () {
            if (this.readOnly) {
                return false;
            }

            var message = $newMessage.val().trim();

            // If it was a message to another person, replace that
            if (message.indexOf('/msg') === 0) {
                message = message.replace(/^\/msg \S+/, '');
            }

            // Re-focus because we lost it on the click
            $newMessage.focus();

            // Do not convert this to a message if it is a command
            if (message[0] === '/') {
                return false;
            }

            var mention = '@' + $(this).text().trim(),
                $li = $(this).closest('li');

            if ($li.data('mention') === undefined) {
                $li = $('.users li.user[data-name="' + $li.data('name') + '"]');
            }
            if ($li.data('mention') !== undefined && $li.data('mention') !== '') {
                mention = $li.data('mention').replace(/\b[a-z]/g, function (letter) {
                    return letter.toUpperCase();
                }) + ',';
            }

            // Prepend our target username
            message = mention + ' ' + message;
            this.setMessage({ content: message });
            return false;
        },

        prevMessage: function () {
            rc.historyLocation -= 1;

            // Skip Command Messages
            while (rc.historyLocation >= 0 &&
                rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation].content[0] === '/') {
                rc.historyLocation -= 1;
            }

            // Ensure location is valid
            if (rc.historyLocation < 0) {
                rc.historyLocation = (rc.messageHistory[client.chat.state.activeRoom] || []).length - 1;
            }

            if (rc.historyLocation >= 0) {
                this.selectMessage(rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation]);
            }
        },

        nextMessage: function () {
            rc.historyLocation += 1;

            // Skip commands
            while (rc.historyLocation < (rc.messageHistory[client.chat.state.activeRoom] || []).length &&
                rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation].content[0] === '/') {
                rc.historyLocation += 1;
            }

            // Ensure location is valid
            rc.historyLocation = (rc.historyLocation) % (rc.messageHistory[client.chat.state.activeRoom] || []).length;

            if (rc.historyLocation >= 0) {
                this.selectMessage(rc.messageHistory[client.chat.state.activeRoom][rc.historyLocation]);
            }
        },

        cycleMessage: function (direction) {
            var currentMessage = $newMessage.attr('message-id');

            if (currentMessage === undefined || this.lastCycledMessage === currentMessage) {
                if (direction === 'prev') {
                    this.prevMessage();
                } else if (direction === 'next') {
                    this.nextMessage();
                }
                return true;
            }

            return false;
        },

        selectMessage: function (message) {
            if (!message.replaced) {
                var retries = 0;

                var awaitMessageId = setInterval(function () {
                    if (message.replaced) {
                        this.setMessage(message);
                        clearInterval(awaitMessageId);
                    }
                    if (retries > 25) {
                        clearInterval(awaitMessageId);
                    }
                    retries += 1;
                }, 100);
            } else {
                this.setMessage(message);
            }
        },

        setReadOnly: function (isReadOnly) {
            this.readOnly = isReadOnly;

            if (this.readOnly === true) {
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
        },

        toggleMessageSection: function (disabledIt) {
            if (disabledIt) {
                // disable send button, textarea and file upload
                $newMessage.attr('disabled', 'disabled');
                $submitButton.attr('disabled', 'disabled');
                $fileUploadButton.attr('disabled', 'disabled');
                $hiddenFile.attr('disabled', 'disabled');
            } else if (!this.readOnly) {
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
        },

        setMessage: function (clientMessage) {
            if (clientMessage !== undefined && clientMessage.content !== undefined) {
                $newMessage.val(clientMessage.content);

                this.newMessageLines = clientMessage.content.split('\n').length;
                this.updateNewMessageSize();

                $('.my-message').removeClass('editing');


                if (clientMessage.id !== undefined) {
                    $newMessage.attr('message-id', clientMessage.id);

                    $newMessage.addClass('editing');

                    $('#m-' + clientMessage.id).addClass('editing');
                    $('#m-' + clientMessage.id)[0].scrollIntoView();

                    this.lastCycledMessage = clientMessage.id;
                }

                $newMessage.selectionEnd = clientMessage.content.length;
            }
        },

        resetSelection: function (id) {
            if (id !== undefined) {
                $('#m-' + id).removeClass('editing');
            } else {
                $('.my-message').removeClass('editing');
            }

            $newMessage.val('');
            this.newMessageLines = 1;

            $newMessage.removeAttr('message-id');
            $newMessage.removeClass('editing');
        }
    });
});