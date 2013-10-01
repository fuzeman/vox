/*global define, window, clearTimeout*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/core/events',
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
            $inactiveSince.livestamp(new Date());
        } 

        return true;
    };

    RoomUser.prototype.updateNote = function () {
        var $title = this.$roomUser.find('.name'),
            noteText = this.user.note,
            noteTextEncoded = null,
            requireRoomUpdate = false;

        if (this.user.noteClass === 'afk') {
            noteText = this.user.note + ' (' + this.user.timeAgo + ')';
            requireRoomUpdate = this.setActive();
        } else if (this.user.active) {
            requireRoomUpdate = this.setActive();
        } else {
            requireRoomUpdate = this.setInActive();
        }

        noteTextEncoded = $('<div/>').html(noteText).text();

        // Remove all classes and the text
        $title.removeAttr('title');

        if (this.user.note) {
            $title.attr('title', noteTextEncoded);
        }

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
        var $extendedTitle = this.$roomUser.find('.extended .title');

        if (this.user.status_type !== null &&
            this.user.status_result !== null) {
            var result = this.user.status_result;

            var $titleSpan = $('span', $extendedTitle),
                tooltip = "";
            
            // Set basic result
            if (result.title !== undefined) {
                tooltip = result.title;

                if (result.url !== undefined) {
                    $titleSpan.html('<a class="main"/>');
                    $('a.main', $titleSpan).attr('href', result.url);
                    $('a.main', $titleSpan).attr('target', '_blank');
                    $('a.main', $titleSpan).text(result.title);
                } else {
                    $titleSpan.html('<span class="main"/>');
                    $('span.main', $titleSpan).text(result.title);
                }

                // Append sub result if it exists
                if (result.sub !== undefined) {
                    // Add sub title to tooltip
                    if (result.sub_title !== undefined) {
                        tooltip = result.sub + ' ' + result.sub_title + ' - ' + tooltip;
                    } else {
                        tooltip = result.sub + ' - ' + tooltip;
                    }

                    // Add sub to element
                    if (result.sub_url !== undefined) {
                        $titleSpan.prepend('<a class="sub"/> - ');
                        $('a.sub', $titleSpan).attr('href', result.sub_url);
                        $('a.sub', $titleSpan).attr('target', '_blank');
                        $('a.sub', $titleSpan).text(result.sub);
                    } else {
                        $titleSpan.prepend('<span class="sub"/> - ');
                        $('span.sub', $titleSpan).text(result.sub);
                    }
                }
            }

            // Update DOM
            $extendedTitle.attr('title', tooltip);
            
            // Set status icon
            if (this.user.status_type == 'music') {
                $('i', $extendedTitle).attr('class', 'icon-music');
            } else if (this.user.status_type == 'video') {
                $('i', $extendedTitle).attr('class', 'icon-film');
            } else if (this.user.status_type == 'game') {
                $('i', $extendedTitle).attr('class', 'icon-gamepad');
            }
        } else {
            $extendedTitle.attr('title', '');
            $('span', $extendedTitle).text('');
            $('i', $extendedTitle).attr('class', '');
        }
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