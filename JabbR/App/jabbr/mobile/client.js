/*global define, document, window, setTimeout*/
define([
    'jabbr/base/client'
], function (Client) {
    return Client.extend({
        constructor: function () {
            this.base();
        }
    });
});