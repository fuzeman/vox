/*global define, document, window, setTimeout*/
define([
    'jquery',
    'logger',
    'jabbr/base/client',
    'jabbr/core/events',
], function ($, Logger, Client, events) {
    var logger = new Logger('jabbr/desktop/client');

    logger.trace('loaded');

    return Client.extend({
        constructor: function () {
            this.base();

            this.mentionStrings = null,
            this.customMentionRegex = null,
            this.privateRooms = null

            $(window).bind(events.focused, $.proxy(this.focused, this));
        },

        generateCustomMentionRegex: function (strings) {
            var result = "(<=,|\\s|\\.|\\(|\\[|^)(?:{0})(?=,|\\s|\\.|\\!|\\?|\\)|\\]|$)";
            result = result.replace("{0}", strings.join("|"));

            return new RegExp(result, "i");
        },

        updateMentions: function (mentions) {
            this.mentionStrings = mentions;
            this.customMentionRegex = this.generateCustomMentionRegex(mentions);
        },

        login: function (rooms, myRooms, preferences, mentions, notifications) {
            logger.trace('login');

            this.updateMentions(mentions);
            this.privateRooms = myRooms;

            this.base(rooms, myRooms, preferences, mentions, notifications);
        },

        focused: function () {
            events.trigger(events.ui.clearUnread);
            this.trigger(events.client.activityUpdated);

            try {
                this.chat.server.updateActivity();
            } catch (e) {
                this.connection.hub.log('updateActivity failed');
            }
        }
    });
});