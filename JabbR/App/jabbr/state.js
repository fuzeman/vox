/*global define*/
define(['jquery', 'jquery.cookie'], function ($) {
    var stateCookie = null;
    var state = null;

    return {
        update: function () {
            stateCookie = $.cookie('jabbr.state');
            state = stateCookie ? JSON.parse(stateCookie) : {};
        },
        get: function () {
            if (stateCookie === null || state === null) {
                this.update();
            }

            return state;
        },
        save: function (activeRoom) {
            var newState = {
                activeRoom: activeRoom,
                preferences: this.get().preferences
            };
            var jsonState = window.JSON.stringify(newState);

            $.cookie('jabbr.state', jsonState, { path: '/', expires: 30 });
        }
    };
});