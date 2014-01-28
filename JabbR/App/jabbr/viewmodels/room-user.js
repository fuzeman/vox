/*global define, window, clearTimeout*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events',
    'livestamp'
], function ($, Logger, kernel, events) {
    var logger = new Logger('jabbr/viewmodels/message'),
        ru = null,
        client = null;

    events.bind(events.activated, function () {
        client = kernel.get('jabbr/client');

        logger.trace('activated');
    });

    function RoomUser(roomUi, user, roomName, room) {
        ru = roomUi;

        this.user = user;

        this.roomName = roomName;
        this.room = room;

        this.$roomUser = null;
    }

    RoomUser.prototype.setOwner = function (isOwner) {
        var $roomUser = this.$roomUser.data('owner', isOwner);

        if (isOwner) {
            $roomUser.attr('data-owner', true);
        } else {
            $roomUser.removeAttr('data-owner');
        }

        this.room.updateUserStatus($roomUser);
    };

    RoomUser.prototype.setAdmin = function (isAdmin) {
        var $roomUser = this.$roomUser.data('admin', isAdmin);

        if (isAdmin) {
            $roomUser.attr('data-admin', true)
                     .find('.admin')
                     .text('(admin)');
        } else {
            $roomUser.removeAttr('data-admin')
                     .find('.admin')
                     .text('');
        }

        this.room.updateUserStatus($roomUser);
    };

    RoomUser.prototype.setActive = function () {
        var $inactiveSince = this.$roomUser.find('.inactive-since');

        if (this.$roomUser.data('active') === true) {
            return false;
        }

        this.$roomUser.attr('data-active', true);
        this.$roomUser.data('active', true);
        this.$roomUser.removeClass('inactive');

        if ($inactiveSince.livestamp('isLiveStamp')) {
            $inactiveSince.livestamp('destroy');
        }

        return true;
    };

    RoomUser.prototype.setInActive = function () {
        var $inactiveSince = this.$roomUser.find('.inactive-since');

        if (this.$roomUser.data('active') === false) {
            return false;
        }

        this.$roomUser.attr('data-active', false);
        this.$roomUser.data('active', false);
        this.$roomUser.addClass('inactive');

        if (!$inactiveSince.html()) {
            $inactiveSince.livestamp(this.user.lastActive);
        }

        return true;
    };

    RoomUser.prototype.updateNote = function () {
        var $extended = this.$roomUser.find('.extended'),
            $note = $extended.find('.note'),
            noteText = this.user.note,
            noteTextEncoded = null,
            requireRoomUpdate = false;

        if (this.user.noteClass === 'afk') {
            noteText = this.user.note + ' (' + this.user.timeAgo + ')';
            requireRoomUpdate = this.setInActive();
        } else if (this.user.active) {
            requireRoomUpdate = this.setActive();
        } else {
            requireRoomUpdate = this.setInActive();
        }

        noteTextEncoded = $('<div/>').html(noteText).text();

        // Update note
        if (this.user.note) {
            // Add note status element if one doesn't exist
            if ($note.length === 0) {
                $note = $('<li class="note"><i class="icon-edit"></i> <span></span></li>');

                $extended.append($note);
            }

            $note.attr('title', noteTextEncoded);
            $('span', $note).text(noteTextEncoded);
        } else {
            $note.remove();
        }

        this.updateExtended();

        if (requireRoomUpdate) {
            this.$roomUser.each(function () {
                var room = ru.getRoomElements($(this).data('inroom'));
                room.updateUserStatus($(this));
                room.sortLists($(this));
            });
        }
    };

    RoomUser.prototype.updateFlag = function () {
        var $flag = this.$roomUser.find('.flag');

        $flag.removeAttr('class');
        $flag.addClass('flag');
        $flag.removeAttr('title');

        if (this.user.flagClass) {
            $flag.addClass(this.user.flagClass);
            $flag.show();
        } else {
            $flag.hide();
        }

        if (this.user.country) {
            $flag.attr('title', this.user.country);
        }
    };

    RoomUser.prototype.updateExternalStatus = function () {
        var $extended = this.$roomUser.find('.extended'),
            $externalStatus = $extended.find('.external-status');

        if ($externalStatus.length === 0) {
            $externalStatus = $('<li class="external-status"><i></i> <span></span></li>');

            $externalStatus.hover(
                $.proxy(this.statusHoverEnter, this),
                $.proxy(this.statusHoverLeave, this)
            );

            $extended.prepend($externalStatus);
        }

        if (this.user.status_type !== null &&
            this.user.status_result !== null) {
            var result = this.user.status_result;

            var $titleSpan = $('span', $externalStatus),
                tooltipFragments = [];

            $titleSpan.empty();

            // Construct title and tooltip from result
            if (result.titles !== undefined) {
                for (var i = 0; i < result.titles.length; i++) {
                    var title = result.titles[i];

                    // Construct status elements from non-extended titles
                    if (title.extended === undefined || title.extended === false) {
                        var $elem;

                        if (title.url !== undefined) {
                            $elem = $('<a target="_blank" />');

                            $elem.attr('href', title.url)
                                .text(title.value);
                        } else {
                            $elem = $('<span />');

                            $elem.text(title.value);
                        }

                        $titleSpan.append($elem);

                        // Insert separator
                        if (i < result.titles.length - 1) {
                            $titleSpan.append(' - ');
                        }
                    }

                    tooltipFragments.push(title.value);
                }
            }

            // Update Tooltip
            $externalStatus.attr('title', tooltipFragments.join(' - '));

            // Set status icon
            if (this.user.status_type == 'music') {
                $('i', $externalStatus).attr('class', 'icon-music');
            } else if (this.user.status_type == 'video') {
                $('i', $externalStatus).attr('class', 'icon-film');
            } else if (this.user.status_type == 'game') {
                $('i', $externalStatus).attr('class', 'icon-gamepad');
            }

            // Animate status art
            this.updateStatusArt(result.art);
        } else {
            $externalStatus.remove();
            
            // Clear status art
            this.updateStatusArt(null);
        }

        this.updateExtended();
    };

    RoomUser.prototype.updateStatusArt = function (url) {
        var $art = this.$roomUser.find('.art'),
            $statusArt = $art.find('.status');
        
        // Clear status art and disable cube rotation
        if (url === undefined || url === null || url.length === 0) {
            $art.addClass('rotation-disabled');
            $statusArt.css('background-image', '');
            
            this.artChangeState('gravatar', true);
            
            return;
        }

        // Reset status and cube state
        $art.removeClass('rotation-disabled');
        $statusArt.attr('class', 'status ' + this.user.status_source);

        $art.data('current-url', url);

        var c = new Image();

        c.onload = $.proxy(function () {
            // Ensure this is still the image we want to display
            if (url !== $art.data('current-url')) {
                return;
            }
            
            $statusArt.css('background-image', "url('" + url + "')");

            // Ensure we only animate from gravatar state
            this.artChangeState('status', true);
        }, this);

        c.src = url;
    };

    RoomUser.prototype.artChangeState = function (state, force) {
        force = typeof force !== 'undefined' ? force : false;

        var $art = this.$roomUser.find('.art');
        
        if ($art.data('manual') === true && !force) {
            return;
        }
        
        if (state == 'status') {
            // Switch from 'gravatar' to 'status' state
            $art.removeClass('show-gravatar')
                .addClass('show-status');
            
            // Queue reset back to gravatar state
            $art.delay(5000).queue($.proxy(function (next) {
                this.artChangeState('gravatar');
                next();
            }, this));
        } else if (state == 'gravatar') {
            // Switch from 'status' to 'gravatar' state
            $art.removeClass('show-status')
                .addClass('show-gravatar');
        }
    };

    RoomUser.prototype.statusHoverEnter = function () {
        var $art = this.$roomUser.find('.art');
        
        if ($art.hasClass('rotation-disabled')) {
            return;
        }

        $art.data('manual', true)
            .removeClass('show-gravatar')
            .addClass('show-status');
    };

    RoomUser.prototype.statusHoverLeave = function () {
        var $art = this.$roomUser.find('.art');

        $art.data('manual', false)
            .removeClass('show-status')
            .addClass('show-gravatar');
    };

    RoomUser.prototype.updateActivity = function () {
        var $inactiveSince = this.$roomUser.find('.inactive-since');

        if (this.user.active === true) {
            if (this.$roomUser.hasClass('inactive')) {
                this.$roomUser.removeClass('inactive');
                $inactiveSince.livestamp('destroy');
            }
        } else {
            if (!this.$roomUser.hasClass('inactive')) {
                this.$roomUser.addClass('inactive');
            }

            if (!$inactiveSince.html()) {
                $inactiveSince.livestamp(this.user.lastActive);
            }
        }

        this.updateNote();
    };

    RoomUser.prototype.updateExtended = function () {
        var $extended = this.$roomUser.find('.extended'),
            $items = $extended.find('li');

        if ($items.length === 2) {
            $extended.addClass('dual');
        } else {
            $extended.removeClass('dual');
        }
    };

    RoomUser.prototype.setTyping = function () {
        var $roomUser = this.$roomUser,
            timeout = null;

        // Do not show typing indicator for current user
        if (this.user.name === client.chat.state.name) {
            return;
        }

        // Mark the user as typing
        $roomUser.addClass('typing');
        $(".user-status-container", $roomUser).addClass('animated pulse');
        var oldTimeout = $roomUser.data('typing');

        if (oldTimeout) {
            clearTimeout(oldTimeout);
        }

        timeout = window.setTimeout(function () {
            $roomUser.removeClass('typing');
            $(".user-status-container", $roomUser).removeClass('animated pulse');
        },
            3000);

        $roomUser.data('typing', timeout);
    };

    RoomUser.prototype.updateUserName = function () {
        var user = this.user;

        this.$roomUser.find('.name').fadeOut('normal', function () {
            $(this).html(user.name);
            $(this).fadeIn('normal');
        });

        this.$roomUser.data('name', user.name);
        this.$roomUser.attr('data-name', user.name);
        this.room.sortLists(this.$roomUser);
    };

    RoomUser.prototype.updateGravatar = function () {
        var src = 'https://secure.gravatar.com/avatar/' + this.user.hash + '?s=16&d=mm';

        this.$roomUser.find('.gravatar').attr('src', src);
    };

    RoomUser.prototype.updateMentions = function () {
        this.$roomUser.data('mention', this.user.mention);
        this.$roomUser.attr('data-mention', this.user.mention);
    };

    return RoomUser;
});