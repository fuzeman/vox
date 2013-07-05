define([
    'jquery.timeago',
    'livestamp'
], function () {
    var ru = null;

    function RoomUser(roomUi, user, roomName, room) {
        ru = roomUi;

        this.user = user;
        
        this.roomName = roomName;
        this.room = room;

        this.$roomUser = null;
    };

    RoomUser.prototype.setOwner = function() {
        this.$roomUser
            .attr('data-owner', true)
            .data('owner', true);
        
        this.room.updateUserStatus(this.$roomUser);
    };

    RoomUser.prototype.setActive = function () {
        var $idleSince = this.$roomUser.find('.idle-since');
        
        if (this.$roomUser.data('active') === true) {
            return false;
        }
        
        this.$roomUser.attr('data-active', true);
        this.$roomUser.data('active', true);
        this.$roomUser.removeClass('idle');
        
        if ($idleSince.livestamp('isLiveStamp')) {
            $idleSince.livestamp('destroy');
        }
        
        return true;
    };

    RoomUser.prototype.setInActive = function () {
        if (this.$roomUser.data('active') === false) {
            return false;
        }
        
        this.$roomUser.attr('data-active', false);
        this.$roomUser.data('active', false);
        this.$roomUser.addClass('idle');
        
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
        }
        else if (this.user.active) {
            requireRoomUpdate = this.setActive();
        }
        else {
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

    RoomUser.prototype.updateActivity = function () {
        var $idleSince = this.$roomUser.find('.idle-since');

        if (this.user.active === true) {
            if (this.$roomUser.hasClass('idle')) {
                this.$roomUser.removeClass('idle');
                $idleSince.livestamp('destroy');
            }
        } else {
            if (!this.$roomUser.hasClass('idle')) {
                this.$roomUser.addClass('idle');
            }

            if (!$idleSince.html()) {
                $idleSince.livestamp(this.user.lastActive);
            }
        }

        this.updateNote();
    };

    return RoomUser;
});