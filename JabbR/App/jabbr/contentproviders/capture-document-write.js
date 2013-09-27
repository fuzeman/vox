/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/messageprocessors/collapse',
    'jabbr/utility',

    'jquery.captureDocumentWrite'
], function ($, Logger, kernel, collapse, utility) {
    var logger = new Logger('jabbr/contentproviders/capture-document-write'),
        ru = null,
        object = null;

    var initialize = function () {
        function captureDocumentWrite (documentWritePath, headerText, elementToAppendTo) {
            $.fn.captureDocumentWrite(documentWritePath, function (content) {
                var nearEnd = ru.isNearTheEnd(),
                    roomName = null,
                    collapsible = null,
                    insertContent = null,
                    links = null;

                roomName = elementToAppendTo.closest('ul.messages').attr('id');
                roomName = roomName.substring(9);

                collapsible = $('<div><h3 class="collapsible_title">' + utility.getLanguageResource('Content_HeaderAndToggle', headerText) + '</h3><div class="collapsible_box captureDocumentWrite_content"></div></div>');
                $('.captureDocumentWrite_content', collapsible).append(content);

                // Since IE doesn't render the css if the links are not in the head element, we move those to the head element
                links = $('link', collapsible);
                links.remove();
                $('head').append(links);

                // Remove the target off any existing anchor tags, then re-add target as _blank so it opens new tab (or window)
                $('a', collapsible).removeAttr('target').attr('target', '_blank');

                insertContent = collapsible[0].outerHTML;

                if (collapse.shouldCollapseContent(insertContent, roomName)) {
                    insertContent = ui.collapseRichContent(insertContent);
                }

                elementToAppendTo.append(insertContent);

                if (nearEnd) {
                    ru.scrollToBottom();
                }
            });
        }

        window.captureDocumentWrite = captureDocumentWrite;

        return {
            activate: function () {
                ru = kernel.get('jabbr/components/rooms.ui');

                logger.trace('activated');
            },

            captureDocumentWrite: captureDocumentWrite
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/contentproviders/capture-document-write', object);
        }

        return object;
    };
});