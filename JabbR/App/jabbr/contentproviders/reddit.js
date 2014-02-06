/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',

    'jquery.iframeResizer',
], function ($, Logger, kernel) {
    var logger = new Logger('jabbr/contentproviders/reddit'),
        ru = null,
        object = null;

    var initialize = function () {
        function getRoom(frame) {
            var messages = $(frame).parents('.messages');

            return messages.attr('id').replace('messages-', '');
        }

        function construct(frames) {
            for (var i = 0; i < frames.length; i++) {
                constructFrame(getRoom(frames[i]), frames[i]);
            }
        }

        function constructFrame(room, frame) {
            var nearEnd = ru.isNearTheEnd(room),
                initial = true;

            frames.attr('constructed', 'true').iFrameResize({
                log: false,
                contentWindowBodyMargin: 0,
                doHeight: true,
                doWidth: false,
                enablePublicMethods: false,
                interval: 33,
                autoResize: true,
                callback: function (messageData) {
                    if (initial) {
                        initial = false;

                        if (nearEnd) {
                            ru.scrollToBottom(room);
                        }
                    }
                }
            });

            if (nearEnd) {
                ru.scrollToBottom(room);
            }
        }

        window.contentproviders.reddit = {
            construct: construct
        };

        return {
            activate: function () {
                ru = kernel.get('jabbr/components/rooms.ui');

                logger.trace('activated');
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/contentproviders/reddit', object);
        }

        return object;
    };
});