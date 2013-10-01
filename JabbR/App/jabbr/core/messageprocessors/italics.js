/*global define*/
define([
    'kernel',
    'jabbr/core/events'
], function (kernel, events) {
    return function () {
        var processor = kernel.get('jabbr/messageprocessors/processor');

        processor.bind(events.processor.beforeProcessPlainContent, function (event, handler) {
            var type = (handler.data || {}).type || '';

            if (type == 'pm') {
                return;
            }

            var re = /(?:^|\s)(?:\*|_)([^\*_]*)(?:\*|_)(?:$|\s)/g,
                match = null,
                result = handler.get();

            // Ignore multi-line paste messages
            if(result.indexOf('\n') != -1) {
                return;
            }

            //Replaces *test* occurrences in message with <i>test</i> so you can use italics
            while ((match = re.exec(result)) !== null) {
                if (match[1].length > 0) {
                    var head = result.substring(0, match.index);
                    var tail = result.substring(match.index + match[0].length, result.length);
                    result = head + " <i>" + match[1] + "</i> " + tail;
                }
            }

            handler.set(result);
        });
    };
});
