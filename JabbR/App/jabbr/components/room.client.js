define([
    'jabbr/client',
    'jabbr/ui',
    'jabbr/state',
], function (client, ui, state) {
    console.log('[jabbr/components/room.client]');

    var events = {        
        activateRoom: 'jabbr.components.room.client.activateRoom'
    };

    var $this = $(this),
        messageHistory = {},
        historyLocation = 0;
    
    //
    // Private Functions
    //

    function getRoomPreferenceKey(roomName) {
        return '_room_' + roomName;
    }

    return {
        events: events,

        getRoomId: function(roomName) {
            return window.escape(roomName.toString().toLowerCase()).replace(/[^A-Za-z0-9]/g, '_');
        },
        getRoomNameFromHash: function(hash) {
            if (hash.length && hash[0] === '/') {
                hash = hash.substr(1);
            }

            var parts = hash.split('/');
            if (parts[0] === 'rooms') {
                return parts[1];
            }

            return null;
        },
        setActiveRoom: function (room) {
            console.log("setActiveRoom(" + room + ")");
            if (room === 'Lobby') {
                populateLobbyRooms();

                // Remove the active room
                client.chat.state.activeRoom = undefined;
            }
            else {
                // When the active room changes update the client state and the cookie
                client.chat.state.activeRoom = room;
            }

            $this.trigger(events.activateRoom, room);
            state.save(client.chat.state.activeRoom);

            historyLocation = (messageHistory[client.chat.state.activeRoom] || []).length - 1;
        },

        // Preferences
        getRoomPreferenceKey: getRoomPreferenceKey,
        getRoomPreference: function(roomName, name) {
            return (preferences[getRoomPreferenceKey(roomName)] || {})[name];
        },
        setRoomPreference: function(roomName, name, value) {
            var roomPreferences = preferences[getRoomPreferenceKey(roomName)];

            if (!roomPreferences) {
                roomPreferences = {};
                preferences[getRoomPreferenceKey(roomName)] = roomPreferences;
            }

            roomPreferences[name] = value;

            state.save(client.chat.state.activeRoom);
        },
        
        bind: function (eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
});