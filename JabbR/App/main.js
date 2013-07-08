﻿/*global require, window*/
require.config({
    baseUrl: '/app',

    paths: {
        'noext': 'plugins/noext',

        'bootstrap': '../Scripts/bootstrap',

        'jquery': '../Scripts/jquery-1.9.1',
        'jquery-migrate': '../Scripts/jquery-migrate-1.2.1.min',
        'jquery.cookie': '../Scripts/jquery.cookie',
        'jquery.signalr': '../Scripts/jquery.signalR-2.0.0-rc1-130629-b89',
        'jquery.history': '../Scripts/jquery.history',
        'jquery.tmpl': '../Scripts/jQuery.tmpl',
        'jquery.sortElements': '../Scripts/jquery.sortElements',
        'jquery.timeago': '../Scripts/jquery.timeago.0.10',
        'jquery.fancybox': '../Scripts/jquery.fancybox',

        'quicksilver': '../Scripts/quicksilver',
        'markdown': '../Scripts/Markdown.Converter',
        'moment': '../Scripts/moment.min',
        'livestamp': '../Scripts/livestamp.min',
        'linkify': '../Scripts/ba-linkify.min',
        'stacktrace': '../Scripts/stacktrace-min-0.4'
    },

    shim: {
        'bootstrap': ['jquery'],

        'jquery-migrate': ['jquery'],
        'jquery.cookie': ['jquery'],
        'jquery.signalr': ['jquery'],
        'jquery.history': ['jquery', 'jquery-migrate'],
        'jquery.tmpl': ['jquery'],
        'jquery.sortElements': ['jquery'],
        'jquery.timeago': ['jquery'],

        'markdown': {
            exports: 'Markdown'
        },
        'moment': {
            exports: 'moment'
        },
        'livestamp': ['jquery'],
        'linkify': {
            exports: 'linkify'
        },
        'stacktrace': {
            exports: 'printStackTrace'
        },

        'noext!signalr/hubs': {
            deps: ['jquery', 'jquery.signalr']
        }
    }
});

window.onload = function () {
    require(['jquery.signalr', 'logger'], function (signalr, Logger) {
        Logger.prototype.traceEnabled = true;

        var logger = new Logger('main');
        logger.trace('loading');

        require(['jabbr/client', 'jabbr/ui', 'jabbr/events'], function (client, ui, events) {
            // Initialize sub-modules
            client = client();
            ui = ui();
            
            ui.activate();
            client.activate();

            events.trigger(events.activated);

            require([
                'jabbr/components/connection-status',
                'jabbr/components/rooms.ui'
            ], function () {
                client.bind(client.events.started, function () {
                    logger.trace('started');

                    require([
                        'jabbr/components/help'
                    ]);
                });
                client.start();
            });
        });
    });
};