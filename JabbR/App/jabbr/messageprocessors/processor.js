/*global define, require*/
define([
    'jquery',
    'logger',
    'jabbr/events',
    'jabbr/utility',
    'jabbr/templates'
], function ($, Logger, events, utility, templates) {
    var logger = new Logger('jabbr/messageprocessors/processor');
    logger.trace('loaded');

    var ru,
        $this = $(this);

    function trigger(type, data) {
        $this.trigger(type, data);
    }

    function createProcessHandler(content, data) {
        return {
            ru: ru,
            data: data,
            content: content,
            get: function () {
                return this.content;
            },
            set: function (newContent) {
                this.content = newContent;
            }
        };
    }

    function getEventHandlerResult(type, content, data) {
        var handler = createProcessHandler(content, data);

        trigger(type, handler);
        return handler.get();
    }

    //
    // Public Functions
    //

    function processPlainContent(content, isHistory) {
        isHistory = typeof isHistory !== 'undefined' ? isHistory : false;

        var handlerData = {
            isHistory: isHistory
        };

        // Pre-encode content
        content = utility.encodeHtml(content);

        // beforeProcessPlainContent
        content = getEventHandlerResult(
            events.processor.beforeProcessPlainContent,
            content, handlerData
        );

        content = utility.processContent(content, templates, ru.roomCache, true);

        // afterProcessPlainContent
        content = getEventHandlerResult(
            events.processor.afterProcessPlainContent,
            content, handlerData
        );

        return content;
    }

    function processRichContent(content, data) {
        data = typeof data !== 'undefined' ? data : {};

        // beforeProcessRichContent
        content = getEventHandlerResult(
            events.processor.beforeProcessRichContent,
            content, data
        );

        // afterProcessRichContent
        content = getEventHandlerResult(
            events.processor.afterProcessRichContent,
            content, data
        );

        return content;
    }

    function beforeRichElementAttached($elem, data) {
        data = typeof data !== 'undefined' ? data : {};

        // beforeRichElementAttached
        return getEventHandlerResult(
            events.processor.beforeRichElementAttached,
            $elem, data
        );
    }

    function afterRichElementAttached($elem, data) {
        data = typeof data !== 'undefined' ? data : {};

        // afterRichElementAttached
        trigger(events.processor.afterRichElementAttached, [$elem, data]);
    }

    var processor = {
        initialize: initialize,

        processPlainContent: processPlainContent,
        processRichContent: processRichContent,

        beforeRichElementAttached: beforeRichElementAttached,
        afterRichElementAttached: afterRichElementAttached,

        bind: function (eventType, handler) {
            $this.bind(eventType, handler);
        }
    };

    function initialize(roomUi) {
        ru = roomUi;

        // Load message processors
        // TODO: this needs to be moved somewhere else to ensure it's loaded
        // before it needs to be used.
        require([
            'jabbr/messageprocessors/collapse',
            'jabbr/messageprocessors/fancybox',
            'jabbr/messageprocessors/italics',
            'jabbr/messageprocessors/plexr'
        ], function (collapse, fancybox, italics, plexr) {
            var initializeProcessors = [
                collapse, fancybox, italics, plexr
            ];

            for (var i = 0; i < initializeProcessors.length; i++) {
                var p = initializeProcessors[i];

                if ('initialize' in p) {
                    p.initialize(processor, ru);
                    p.bind();
                } else {
                    p(processor, ru);
                }
            }

            logger.info('loaded message processors');
        });
    }

    return processor;
});