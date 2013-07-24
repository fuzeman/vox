/*global define*/
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
        activated: 'jabbr.activated',

        client: {
            // Handles

            // Emits
            started: 'jabbr.client.started',

            stateChanged: 'jabbr.client.stateChanged',
            connected: 'jabbr.client.connected',
            disconnected: 'jabbr.client.disconnected',
            reconnecting: 'jabbr.client.reconnecting',

            loggedOn: 'jabbr.client.loggedOn',
            activityUpdated: 'jabbr.client.activityUpdated'
        },

        ui: {
            // Handles
            clearUnread: 'jabbr.core.ui.clearUnread',
            updateUnread: 'jabbr.core.ui.updateUnread',
            updateTitle: 'jabbr.core.ui.updateTitle'

            // Emits
        },

        rooms: {
            ui: {
                updateUnread: 'jabbr.components.rooms.ui.updateUnread',
                activateRoom: 'jabbr.components.rooms.ui.activateRoom'
            },
            client: {
                scrollToBottom: 'jabbr.components.rooms.client.scrollToBottom',
                createMessage: 'jabbr.components.rooms.client.addMessage',
                lobbyOpened: 'jabbr.components.rooms.client.lobbyOpened'
            }
        },

        processor: {
            beforeProcessPlainContent: 'jabbr.processor.beforeProcessPlainContent',
            afterProcessPlainContent: 'jabbr.processor.afterProcessPlainContent',

            beforeProcessRichContent: 'jabbr.processor.beforeProcessRichContent',
            afterProcessRichContent: 'jabbr.processor.afterProcessRichContent',

            beforeRichElementAttached: 'jabbr.processor.beforeRichElementAttached',
            afterRichElementAttached: 'jabbr.processor.afterRichElementAttached'
        }
    };
});