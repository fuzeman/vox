/*global define*/
define(['jquery', 'kernel'], function ($, kernel) {
    var templates = {
        drawer: {
            room: $('#drawer-room-template')
        }
    };

    return function () {
        kernel.bind('jabbr/templates', templates);

        return templates;
    };
});