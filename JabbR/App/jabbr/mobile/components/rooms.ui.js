/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.ui',
    
    'jabbr/mobile/components/notifications',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/messages',
    'jabbr/mobile/components/lobby'
], function ($, Logger, kernel, RoomsUI,

    // Components
    MobileNotifications, MobileRoomsClient, MobileMessages, MobileLobby
) {
    var logger = new Logger('jabbr/desktop/components/rooms.ui'),
        client = null,
        rc = null,
        ui = null,
        notifications = null,
        lobby = null,
        messages = null;

    return RoomsUI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                notifications: new MobileNotifications(),
                rc: new MobileRoomsClient(),
                messages: new MobileMessages(),
                lobby: new MobileLobby()
            };

            rc = this.submodules.rc;
        },
        
        activate: function () {
            this.base();

            client = kernel.get('jabbr/client');
            ui = kernel.get('jabbr/ui');
            notifications = kernel.get('jabbr/components/notifications');
            lobby = kernel.get('jabbr/components/lobby');
            messages = kernel.get('jabbr/components/messages');
        },
        
        addRoom: function (roomViewModel) {
            // Do nothing if the room exists
            var roomName = roomViewModel.Name;
            logger.trace("addRoom(" + roomName + ")");

            if (rc.hasRoom(roomViewModel.Name)) {
                if (!rc.validRoom(roomViewModel.Name)) {
                    this.updateRoom(roomViewModel.Name);
                }
                return false;
            }

            var room = this.createRoom(roomViewModel.Name),
                roomId = null,
                viewModel = null;
            
            roomId = rc.getRoomId(roomName);
            
            // Add the tab
            viewModel = {
                id: roomId,
                name: roomName,
                closed: roomViewModel.Closed
            };
            
            if (!rc.inRoomCache(roomName)) {
                lobby.addRoom(roomViewModel);
            }
        },
    });
});