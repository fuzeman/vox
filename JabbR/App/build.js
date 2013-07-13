({
    baseUrl: "../App",
    optimize: "uglify2",
    dir: "../Build",
    modules: [
        {
            name: 'chat-main',
            include: [
                'jabbr/messageprocessors/fancybox',
                'jabbr/messageprocessors/plexr',
                'jabbr/messageprocessors/italics'
            ]
        },
        {
            name: 'notifications-main'
        }
    ],
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
        'jquery.pulse': '../Scripts/jquery.pulse',
        'jquery.autotabcomplete': '../Scripts/jquery.autotabcomplete',
        'jquery.color': '../Scripts/jquery.color-2.1.2',
        'jquery.pubsub': '../Scripts/jquery.pubsub',

        'quicksilver': '../Scripts/quicksilver',
        'markdown': '../Scripts/Markdown.Converter',
        'moment': '../Scripts/moment.min',
        'livestamp': '../Scripts/livestamp.min',
        'linkify': '../Scripts/ba-linkify.min',
        'stacktrace': '../Scripts/stacktrace-min-0.4'
    }
})