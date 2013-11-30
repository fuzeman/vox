/*global define, document, window, setTimeout*/
define([
    'jabbr/base/ui',
    'jabbr/mobile/components/rooms.ui',
    'jabbr/mobile/components/help',
    'jabbr/mobile/templates',

    'snap'
], function (UI, MobileRoomsUI, MobileHelp, templates) {
    var $title = $('#title'),
        $subtitle = $('.subtitle', $title);

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
                element: document.getElementById('container'),
                hyperextensible: true,
                resistance: 0.6
            });
        },
        
        _activateRoom: function (event, room) {
            this.base(event, room);

            $subtitle.text(room.getName());

            this.snapper.close();
        }
    });
});