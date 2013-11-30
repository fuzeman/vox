/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/messages',
        
    'jquery.tmpl'
], function ($, Logger, kernel, Messages) {
    var logger = new Logger('jabbr/mobile/components/messages'),
        ru = null,
        processor = null,
        templates = null;

    return Messages.extend({
        constructor: function () {
            this.base();
        },

        activate: function () {
            this.base();

            //client = kernel.get('jabbr/client');
            //ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            //rc = kernel.get('jabbr/components/rooms.client');
            //notifications = kernel.get('jabbr/components/notifications');
            processor = kernel.get('jabbr/messageprocessors/processor');
            templates = kernel.get('jabbr/templates');

            this.attach();
        },
        
        attach: function () {},
    });
});