define(['jabbr/client'], function(client) {
    var user = {        
        name: null,
    };

    client.bind(client.events.logOn, function() {
        user.name = client.chat.state.name;
    });

    return user;
});