/*global require, window*/
require.config({
    baseUrl: '/app',

    paths: {
        'noext': 'plugins/noext',

        'base': '../Scripts/Base',
        'bootstrap': '../Scripts/bootstrap',

        'jquery': '../Scripts/jquery-2.0.3',
        'jquery-migrate': '../Scripts/jquery-migrate-1.2.1.min',
        'jquery.cookie': '../Scripts/jquery.cookie',
        'jquery.captureDocumentWrite': '../Scripts/jquery.captureDocumentWrite',
        'jquery.signalr': '../Scripts/jquery.signalR-2.1.0-pre-130916-b211',
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
        'json2': '../Scripts/json2',
        'snap': '../Scripts/snap.min.js'
    },

    shim: {
        'jabbr/mobile/client': ['jquery.signalr'],

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
            'base',
            'jabbr/mobile/client',
            'jabbr/mobile/ui',
            'jabbr/core/events',
    ], function ($, signalr, Logger, base, MobileClient, MobileUI, events) {
        var logger = new Logger('chat');
        logger.trace('loading');

        // Initialize sub-modules
        client = new MobileClient();
        ui = new MobileUI();

        // Activate all the modules
        ui.activate();
        client.activate();

        events.trigger(events.activated);

        require([
            'jabbr/mobile/components/rooms.ui'
        ], function () {
            client.bind(events.client.started, function () {
                logger.trace('started');
            });
            client.start();
        });
    });
};