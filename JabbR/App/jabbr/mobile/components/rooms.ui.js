define([
    'jabbr/base/components/rooms.ui',
    'jabbr/mobile/components/rooms.client',
    'jabbr/mobile/components/lobby'
], function (RoomsUI, MobileRoomsClient, MobileLobby) {
    return RoomsUI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                rc: new MobileRoomsClient(),
                lobby: new MobileLobby()
            };
        }
    });
});