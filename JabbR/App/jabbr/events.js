define(['jquery'], function ($) {
    var root = $(this);

    return {
        trigger: function (event, parameters) {
            root.trigger(event, parameters);
        },
        bind: function (event, handler) {
            root.bind(event, handler);
        },

        error: 'jabbr.error',
        focused: 'jabbr.focus',

        client: {
            // Handles

            // Emits
            started: 'jabbr.client.started',

            stateChanged: 'jabbr.client.stateChanged',
            connected: 'jabbr.client.connected',
            disconnected: 'jabbr.client.disconnected',
            reconnecting: 'jabbr.client.reconnecting',

            loggedOn: 'jabbr.client.loggedOn',
        },
        
        ui: {
            // Handles
            updateUnread: 'jabbr.ui.updateUnread'
            
            // Emits
        },
        
        rooms: {
            ui: {
                activateRoom: 'jabbr.components.rooms.ui.activateRoom',
            },
            client: {
                scrollToBottom: 'jabbr.components.rooms.client.scrollToBottom',
                createMessage: 'jabbr.components.rooms.client.addMessage',
                lobbyOpened: 'jabbr.components.rooms.client.lobbyOpened',
            },
        },
    }
});