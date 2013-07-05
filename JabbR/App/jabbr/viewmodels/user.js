define([
    'jquery.timeago',
    'livestamp'
], function () {
    var ru = null;

    function getNoteCssClass(user) {
        if (user.IsAfk === true) {
            return 'afk';
        }
        else if (user.Note) {
            return 'message';
        }
        return '';
    }
    
    function getNote(user) {
        if (user.IsAfk === true) {
            if (user.AfkNote) {
                return 'AFK - ' + user.AfkNote;
            }
            return 'AFK';
        }

        return user.Note;
    }
    
    function getFlagCssClass(user) {
        return (user.Flag) ? 'flag flag-' + user.Flag : '';
    }
    
    function User(roomUi, user, isOwner) {
        ru = roomUi;

        var lastActive = user.LastActivity.fromJsonDate();

        this.name = user.Name;
        this.hash = user.Hash;
        this.owner = isOwner;
        this.active = user.Active;
        this.noteClass = getNoteCssClass(user);
        this.note = getNote(user);
        this.flagClass = getFlagCssClass(user);
        this.flag = user.Flag;
        this.country = user.Country;
        this.lastActive = lastActive;
        this.timeAgo = $.timeago(lastActive);
        this.admin = user.IsAdmin;
        this.mention = user.Mention;

        this.$user = null;
    };

    User.prototype.setActive = function() {
        var $idleSince = this.$user.find('.idle-since');
        if (this.$user.data('active') === true) {
            return false;
        }
        this.$user.attr('data-active', true);
        this.$user.data('active', true);
        this.$user.removeClass('idle');
        if ($idleSince.livestamp('isLiveStamp')) {
            $idleSince.livestamp('destroy');
        }
        return true;
    };

    User.prototype.setInActive = function() {
        if (this.$user.data('active') === false) {
            return false;
        }
        this.$user.attr('data-active', false);
        this.$user.data('active', false);
        this.$user.addClass('idle');
        return true;
    };

    User.prototype.updateNote = function() {
        var $title = this.$user.find('.name'),
            noteText = this.note,
            noteTextEncoded = null,
            requireRoomUpdate = false;

        if (this.noteClass === 'afk') {
            noteText = this.note + ' (' + this.timeAgo + ')';
            requireRoomUpdate = this.setActive();
        }
        else if (this.active) {
            requireRoomUpdate = this.setActive();
        }
        else {
            requireRoomUpdate = this.setInActive();
        }

        noteTextEncoded = $('<div/>').html(noteText).text();

        // Remove all classes and the text
        $title.removeAttr('title');

        if (this.note) {
            $title.attr('title', noteTextEncoded);
        }

        if (requireRoomUpdate) {
            this.$user.each(function () {
                var room = ru.getRoomElements($(this).data('inroom'));
                room.updateUserStatus($(this));
                room.sortLists($(this));
            });
        }
    };

    User.prototype.updateFlag = function() {
        var $flag = this.$user.find('.flag');

        $flag.removeAttr('class');
        $flag.addClass('flag');
        $flag.removeAttr('title');

        if (this.flagClass) {
            $flag.addClass(this.flagClass);
            $flag.show();
        } else {
            $flag.hide();
        }

        if (this.country) {
            $flag.attr('title', this.country);
        }
    };

    User.prototype.updateActivity = function() {
        var $idleSince = this.$user.find('.idle-since');
        
        if (this.active === true) {
            if (this.$user.hasClass('idle')) {
                this.$user.removeClass('idle');
                $idleSince.livestamp('destroy');
            }
        } else {
            if (!this.$user.hasClass('idle')) {
                this.$user.addClass('idle');
            }

            if (!$idleSince.html()) {
                $idleSince.livestamp(this.lastActive);
            }
        }

        this.updateNote();
    };

    return User;
});