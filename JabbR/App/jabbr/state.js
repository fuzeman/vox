/*global define, window*/
define(['jquery', 'jquery.cookie'], function ($) {
    var stateCookie = null;
    var state = null;

    return {
        // Core State Functions
        update: function () {
            stateCookie = $.cookie('jabbr.state');
            state = stateCookie ? JSON.parse(stateCookie) : {};
            if (!('preferences' in state)) {
                state.preferences = {};
            }
        },
        get: function () {
            if (stateCookie === null || state === null) {
                this.update();
            }

            return state;
        },
        save: function (activeRoom) {
            var newState = {
                activeRoom: activeRoom || this.get().activeRoom,
                preferences: this.get().preferences
            };
            var jsonState = window.JSON.stringify(newState);

            $.cookie('jabbr.state', jsonState, { path: '/', expires: 30 });
        },

        // Room Preferences
        getRoomPreferenceKey: function (roomName) {
            return '_room_' + roomName;
        },
        getRoomPreference: function (roomName, name) {
            var roomPreferences = this.get().preferences[this.getRoomPreferenceKey(roomName)];
            return (roomPreferences || {})[name];
        },
        setRoomPreference: function (roomName, name, value) {
            var roomPreferences = this.get().preferences[this.getRoomPreferenceKey(roomName)];

            if (!roomPreferences) {
                roomPreferences = {};
                this.get().preferences[this.getRoomPreferenceKey(roomName)] = roomPreferences;
            }

            roomPreferences[name] = value;

            this.save();
        },

        // Preferences
        getPreference: function (name) {
            return this.get().preferences[name];
        },
        setPreference: function (name, value) {
            this.get().preferences[name] = value;
            this.save();
        }
    };
});