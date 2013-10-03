define([
	'logger',
	'kernel',
	'jabbr/base/event-object'
], function (Logger, kernel, EventObject) {
	var logger = new Logger('jabbr/components/rooms.ui');

	return EventObject.extend({
		constructor: function() {
			this.base();

			kernel.bind('jabbr/components/rooms.ui', this);
		},

		activate: function () {
			logger.trace('activated');
		}
	});
});