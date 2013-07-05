define([
    'jabbr/viewmodels/user',
    'jabbr/viewmodels/room-user',
    'logger'
], function (User, RoomUser, Logger) {
    var logger = new Logger('jabbr/components/users');
    logger.trace('loaded');

    // Templates
    var templates = {
        user: $('#new-user-template'),
    };
    
    // Elements
    

    // Variables
    var ru = null,
        users = {};  // { <username>: <User> }

    function createUser(userdata) {
        if (userdata.Name in users) {
            logger.trace("User already exists, returning existing one.")
            return users[userdata.Name];
        }
        
        logger.trace("Creating User userdata.Name: '" + userdata.Name + "'");

        users[userdata.Name] = new User(ru, userdata);

        return users[userdata.Name];
    }
    
    function createRoomUser(userdata, roomName) {
        var user = createUser(userdata);
        
        if (roomName in user.roomUsers) {
            logger.trace("RoomUser already exists, returning existing one.")
            return user.roomUsers[roomName];
        }
        
        logger.trace("Creating RoomUser userdata.Name: '" + userdata.Name + "', roomName: '" + roomName + "'");

        var room = ru.getRoomElements(roomName);

        var roomUser = new RoomUser(ru, user, roomName, room);
        user.roomUsers[roomName] = roomUser;

        // Remove all users that are being removed
        room.users.find('.removing').remove();

        // Get the user element
        var $roomUser = room.getUser(userdata.name);

        if ($roomUser.length) {
            return null;
        }

        $roomUser = templates.user.tmpl(user);
        $roomUser.data('inroom', roomName);
        $roomUser.data('owner', user.owner);
        $roomUser.data('admin', user.admin);
        $roomUser.data('mention', user.mention);

        roomUser.$roomUser = $roomUser;
        
        room.addUser(roomUser);

        roomUser.updateNote();
        roomUser.updateFlag();
        roomUser.updateActivity();

        return user.roomUsers[roomName];
    }
    
    function remove(user, roomName) {
        // TODO: Update this to user 'users' dictionary
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
    
    //
    // Event Handlers
    //
    
    // Hub
    
    // TODO: Handle user update events here

    return {
        initialize: function(roomUi) {
            ru = roomUi;
        },
        remove: remove,
        
        get: function(name) {
            return users[name];
        },
        
        createUser: createUser,
        createRoomUser: createRoomUser,
    }
});