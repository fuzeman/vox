/*global define*/
define([
    'logger',
    'kernel',
    'jabbr/base/event-object'
], function (Logger, kernel, EventObject) {
    var logger = new Logger('jabbr/components/rooms.client'),
        ru = null;

    return EventObject.extend({
        constructor: function () {
            this.base();

            kernel.bind('jabbr/components/rooms.client', this);
        },
        
        activate: function () {
            ru = kernel.get('jabbr/components/rooms.ui');

            logger.trace('activated');
        },
        
        setInitialized: function (roomName) {
            var room = roomName ? this.getRoom(roomName) : ru.getCurrentRoomElements();
            room.setInitialized();
        },
        
        getRoom: function () { logger.warn('getRoom not implemented'); },
        

        openRoomFromHash: function () { logger.warn('openRoomFromHash not implemented'); },
        
        setActiveRoom: function (roomName) { logger.warn('setActiveRoom not implemented'); }
    });
});