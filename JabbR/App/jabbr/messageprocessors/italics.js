/*global define*/
define([
    'jabbr/events'
], function (events) {
    return function (processor) {
        processor.bind(events.processor.beforeProcessPlainContent, function (event, handler) {
            var re = /(?:\*|_)([^\*_]*)(?:\*|_)/g,
                match = null,
                result = handler.get();

            //Replaces *test* occurrences in message with <i>test</i> so you can use italics
            while ((match = re.exec(result)) !== null) {
                if (match[1].length > 0) {
                    var head = result.substring(0, match.index);
                    var tail = result.substring(match.index + match[0].length, result.length);
                    result = head + "<i>" + match[1] + "</i>" + tail;
                }
            }

            handler.set(result);
        });
    };
});