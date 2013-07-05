define([
    'jabbr/client',
    'jabbr/ui',
    'jabbr/state'
], function (client, ui, state) {
    console.log('[jabbr/components/rooms.client]');

    var events = {        
        scrollToBottom: 'jabbr.components.rooms.client.scrollToBottom',
        addUser: 'jabbr.components.rooms.client.addUser',
        createMessage: 'jabbr.components.rooms.client.addMessage',
        lobbyOpened: 'jabbr.components.rooms.client.lobbyOpened'
    };

    var $this = $(this),
        messageHistory = {},
        messageIds = [],
        historyLocation = 0;
    
    //
    // Private Functions
    //

    function getRoomPreferenceKey(roomName) {
        return '_room_' + roomName;
    }
    
    function populateRoom(room) {
        var d = $.Deferred();

        client.connection.hub.log('getRoomInfo(' + room + ')');

        // Populate the list of users rooms and messages 
        client.chat.server.getRoomInfo(room).done(function (roomInfo) {
            client.connection.hub.log('getRoomInfo.done(' + room + ')');

            $.each(roomInfo.Users, function () {
                $this.trigger(events.addUser, [this, room]);
            });

            $.each(roomInfo.Owners, function () {
                ui.setRoomOwner(this, room);
            });

            $.each(roomInfo.RecentMessages, function () {
                this.isHistory = true;
                $this.trigger(events.createMessage, [this, room]);
            });

            //TODO: ui.changeRoomTopic(roomInfo);

            // mark room as initialized to differentiate messages
            // that are added after initial population
            //TODO: ui.setInitialized(room);
            //TODO: ui.scrollToBottom(room);
            //TODO: ui.setRoomListStatuses(room);

            d.resolveWith(client.chat);

            // Watch the messages after the defer, since room messages
            // may be appended if we are just joining the room
            //TODO: ui.watchMessageScroll(messageIds, room);
        }).fail(function (e) {
            connection.hub.log('getRoomInfo.failed(' + room + ', ' + e + ')');
            d.rejectWith(chat);
        });

        return d.promise();
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
        activeRoomChanged: function (room) {
            if (room === 'Lobby') {
                $this.trigger(events.lobbyOpened);

                // Remove the active room
                client.chat.state.activeRoom = undefined;
            }
            else {
                // When the active room changes update the client state and the cookie
                client.chat.state.activeRoom = room;
            }

            $this.trigger(events.scrollToBottom, room);
            state.save(client.chat.state.activeRoom);

            historyLocation = (messageHistory[client.chat.state.activeRoom] || []).length - 1;
        },
        populateRoom: populateRoom,
        
        addMessage: function(message) {
            messageIds.push(message.id);
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
        getPreference: function(name) {
            return preferences[name];
        },
        setPreference: function(name, value) {
            preferences[name] = value;
            //TODO: $(ui).trigger(ui.events.preferencesChanged);
        },
        
        bind: function (eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
});