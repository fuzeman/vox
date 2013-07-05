require.config({
    baseUrl: '/app',
    
    paths: {
        'noext': 'plugins/noext',
        
        'bootstrap': '../Scripts/bootstrap',

        'jquery': '../Scripts/jquery-1.9.0',
        'jquery-migrate': '../Scripts/jquery-migrate-1.0.0.min',
        'jquery.cookie': '../Scripts/jquery.cookie',
        'jquery.signalr': '../Scripts/jquery.signalR-2.0.0-rc1-130629-b89',
        'jquery.history': '../Scripts/jquery.history',
        'jquery.tmpl': '../Scripts/jQuery.tmpl',
        'jquery.sortElements': '../Scripts/jquery.sortElements',
        
        'quicksilver': '../Scripts/quicksilver',
        'markdown': '../Scripts/Markdown.Converter',
    },
    
    shim: {
        'bootstrap': ['jquery'],

        'jquery-migrate': ['jquery'],
        'jquery.cookie': ['jquery'],
        'jquery.signalr': ['jquery'],
        'jquery.history': ['jquery', 'jquery-migrate'],
        'jquery.tmpl': ['jquery'],
        'jquery.sortElements': ['jquery'],
        
        'markdown': {
            exports: 'Markdown'
        },
        
        'noext!signalr/hubs': {
            deps: ['jquery', 'jquery.signalr']
        },
    }
});

window.onload = function() {
    require(['jquery.signalr'], function(signalr) {
        require(['jabbr/client', 'jabbr/ui'], function (client, ui) {
            require([
                'jabbr/components/connection-status',
                'jabbr/components/room.ui'
            ], function() {
                client.bind(client.events.started, function() {
                    console.log('started');

                    require([
                        'jabbr/components/help'
                    ]);
                });
                client.start();
            });
        });
    });
}