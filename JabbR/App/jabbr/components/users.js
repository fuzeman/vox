define([
    'jabbr/viewmodels/user'
], function (User) {
    // Templates
    var templates = {
        user: $('#new-user-template'),
    };
    
    // Elements
    

    // Variables
    var ru = null;

    function add(userdata, roomName) {
        console.log("addUser(" + userdata + ", " + roomName + ")");

        var user = new User(ru, userdata);

        var room = ru.getRoomElements(roomName);

        // Remove all users that are being removed
        room.users.find('.removing').remove();

        // Get the user element
        user.$user = room.getUser(userdata.name);

        if (user.$user.length) {
            return null;
        }

        user.$user = templates.user.tmpl(user);
        user.$user.data('inroom', roomName);
        user.$user.data('owner', user.owner);
        user.$user.data('admin', user.admin);
        user.$user.data('mention', user.mention);
        
        room.addUser(user);
        
        user.updateNote();
        user.updateFlag();

        return user;
    }
    
    function remove(user, roomName) {
        var room = ru.getRoomElements(roomName),
            $user = room.getUser(user.Name);

        $user.addClass('removing')
            .fadeOut('slow', function () {
                var owner = $user.data('owner') || false;
                $(this).remove();

                if (owner === true) {
                    room.setListState(room.owners);
                } else {
                    room.setListState(room.activeUsers);
                }
            });
    }

    return {
        initialize: function(roomUi) {
            ru = roomUi;
        },
        add: add,
        remove: remove,
    }
});