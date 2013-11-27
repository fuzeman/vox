/*global define, document, window, setTimeout*/
define([
    'jabbr/base/ui',
    'jabbr/mobile/components/rooms.ui',
    'snap'
], function (UI, MobileRoomsUI) {
    return UI.extend({
        constructor: function () {
            this.base();

            this.snapper = null;

            this.submodules = {
                ru: new MobileRoomsUI()
            };
        },
        activate: function () {
            this.base();
            
            this.snapper = new Snap({
                element: document.getElementById('container')
            });
        }
    });
});