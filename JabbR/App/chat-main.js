/*global require, window*/
require.config({
    baseUrl: '/app',

    paths: {
        'noext': 'plugins/noext',

        'bootstrap': '../Scripts/bootstrap',

        'jquery': '../Scripts/jquery-1.9.1',
        'jquery-migrate': '../Scripts/jquery-migrate-1.2.1.min',
        'jquery.cookie': '../Scripts/jquery.cookie',
        'jquery.signalr': '../Scripts/jquery.signalR-2.0.0-rc1-130727-b125',
        'jquery.history': '../Scripts/jquery.history',
        'jquery.tmpl': '../Scripts/jQuery.tmpl',
        'jquery.sortElements': '../Scripts/jquery.sortElements',
        'jquery.timeago': '../Scripts/jquery.timeago.0.10',
        'jquery.fancybox': '../Scripts/jquery.fancybox',
        'jquery.pulse': '../Scripts/jquery.pulse',
        'jquery.autotabcomplete': '../Scripts/jquery.autotabcomplete',
        'jquery.color': '../Scripts/jquery.color-2.1.2',

        'quicksilver': '../Scripts/quicksilver',
        'markdown': '../Scripts/Markdown.Converter',
        'moment': '../Scripts/moment.min',
        'livestamp': '../Scripts/livestamp.min',
        'linkify': '../Scripts/ba-linkify.min',
        'stacktrace': '../Scripts/stacktrace-min-0.4',
        'json2': '../Scripts/json2'
    },

    shim: {
        'jabbr/client': ['jquery.signalr'],

        'bootstrap': ['jquery'],

        'jquery': {
            exports: ['$', 'jQuery']
        },
        'jquery-migrate': ['jquery'],
        'jquery.cookie': ['jquery'],
        'jquery.signalr': ['jquery'],
        'jquery.history': ['jquery', 'jquery-migrate'],
        'jquery.tmpl': ['jquery'],
        'jquery.sortElements': ['jquery'],
        'jquery.timeago': ['jquery'],
        'jquery.pulse': ['jquery'],
        'jquery.autotabcomplete': ['jquery'],
        'jquery.color': ['jquery'],

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
        'json2': {
            exports: 'JSON'
        },

        'noext!signalr/hubs': {
            deps: ['jquery', 'jquery.signalr']
        }
    }
});

window.onload = function () {
    require([
            'jquery',
            'jquery.signalr',
            'logger',
            'jabbr/client',
            'jabbr/ui',
            'jabbr/events'],
    function ($, signalr, Logger, client, ui, events) {
        var logger = new Logger('chat');
        logger.trace('loading');

        // Initialize sub-modules
        client = client();
        ui = ui();

        // Activate all the modules
        ui.activate();
        client.activate();

        events.trigger(events.activated);

        require([
            'jabbr/components/rooms.ui'
        ], function () {
            client.bind(client.events.started, function () {
                logger.trace('started');
            });
            client.start();
        });
    });
};