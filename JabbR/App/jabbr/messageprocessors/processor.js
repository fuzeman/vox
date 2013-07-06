define([
    'logger',
    'jabbr/events',
    'jabbr/utility',
    'jabbr/templates',
], function (Logger, events, utility, templates) {
    var logger = new Logger('jabbr/messageprocessors/processor');
    logger.trace('loaded');

    var ru,
        $this = $(this);

    function trigger(type, data) {
        $this.trigger(type, data);
    }
    
    function createProcessHandler(content, data) {
        return {
            data: data,
            _content: content,
            get: function() {
                return this._content;
            },
            set: function(newContent) {
                this._content = newContent;
            }
        };
    }
    
    function getEventHandlerResult(type, content, data) {
        var handler = createProcessHandler(content, data);
        
        trigger(type, handler);
        return handler.get();
    }

    function processPlainContent(content, isHistory) {
        isHistory = typeof isHistory !== 'undefined' ? isHistory : false;
        
        var handlerData = {
            isHistory: isHistory
        }
        
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
    
    function processRichContent(content) {
        
    }


    var processor = {
        initialize: function(roomUi) {
            ru = roomUi;
        },
        
        processPlainContent: processPlainContent,
        processRichContent: processRichContent,
        
        bind: function (eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
    
    // Load message processors
    // TODO: this needs to be moved somewhere else to ensure it's loaded
    // before it needs to be used.
    require(['jabbr/messageprocessors/italics'], function (italics) {
        italics(processor);

        logger.info('loaded message processors');
    });
    
    return processor;
});