require.config({
    baseUrl: '/app',
    
    paths: {
        'noext': 'plugins/noext',
        
        'bootstrap': '../Scripts/bootstrap',

        'jquery': '../Scripts/jquery-1.9.0',
        'jquery.cookie': '../Scripts/jquery.cookie',
        'jquery.signalr': '../Scripts/jquery.signalR-2.0.0-rc1-130629-b89',
    },
    
    shim: {
        'bootstrap': ['jquery'],

        'jquery.cookie': ['jquery'],
        'jquery.signalr': ['jquery'],
        
        'noext!signalr/hubs': {
            deps: ['jquery', 'jquery.signalr']
        },
    }
});

window.onload = function() {
    require(['jquery.signalr'], function(signalr) {
        require(['jabbr/client', 'jabbr/ui'], function (client, ui) {
            require([
                'jabbr/components/connection-status'
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