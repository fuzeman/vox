define([
    'jabbr/base/components/rooms.ui',
    
    'jabbr/mobile/components/notifications',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/messages',
    'jabbr/mobile/components/lobby'
], function (RoomsUI, MobileNotifications, MobileRoomsClient, MobileMessages, MobileLobby) {
    return RoomsUI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                notifications: new MobileNotifications(),
                rc: new MobileRoomsClient(),
                messages: new MobileMessages(),
                lobby: new MobileLobby()
            };
        }
    });
});