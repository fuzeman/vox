/*global define, document, window, setTimeout*/
define([
    'jabbr/base/ui',
    'jabbr/mobile/components/rooms.ui',
    'jabbr/mobile/components/help',
    'jabbr/mobile/templates',

    'snap'
], function (UI, MobileRoomsUI, MobileHelp, templates) {
    return UI.extend({
        constructor: function () {
            this.base();

            this.snapper = null;

            templates = templates();

            this.submodules = {
                ru: new MobileRoomsUI(),
                help: new MobileHelp()
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