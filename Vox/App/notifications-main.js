/*global require, window*/
require.config({
    baseUrl: '/app',

    paths: {
        'jquery': '../Scripts/jquery-2.0.3',
        'jquery.pubsub': '../Scripts/jquery.pubsub',
        
        'markdown': '../Scripts/Markdown.Converter',
        'moment': '../Scripts/moment.min',
        'linkify': '../Scripts/ba-linkify.min'
    },

    shim: {
        'jquery': {
            exports: ['$', 'jQuery']
        },
        'jquery.pubsub': ['jquery']
    }
});

window.onload = function () {
    require(['notifications/ui'], function () {
    });
};