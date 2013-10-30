/*global define, document, window, setTimeout*/
define([
    'jabbr/base/ui',
    'jabbr/mobile/components/rooms.ui'
], function (UI, MobileRoomsUI) {
    return UI.extend({
        constructor: function () {
            this.base();

            this.submodules = {
                ru: new MobileRoomsUI()
            };
        }
    });
});