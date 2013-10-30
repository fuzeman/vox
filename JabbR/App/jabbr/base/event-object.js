/*global define*/
define([
    'jquery'
], function ($) {
    return Base.extend({
        $this: null,

        constructor: function () {
            this.$this = $(this);
        },

        trigger: function (eventType, arguments) {
            this.$this.trigger(eventType, arguments);
        },

        bind: function (eventType, handler) {
            this.$this.bind(eventType, handler);
        }
    });
});