define([
    'jabbr/base/components/rooms.ui',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/lobby',
    'jabbr/mobile/components/notifications'
], function (RoomsUI, MobileRoomsClient, MobileLobby, MobileNotifications) {
    return RoomsUI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                rc: new MobileRoomsClient(),
                lobby: new MobileLobby(),
                notifications: new MobileNotifications()
            };
        }
    });
});