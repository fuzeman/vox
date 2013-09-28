/*global define, document, setInterval*/
define([
    'jquery',
    'logger',
    'kernel',

    'jabbr/contentproviders/capture-document-write',
    'jabbr/contentproviders/github-issues',
    'jabbr/contentproviders/twitter'
], function($, Logger, kernel, captureDocumentWrite, githubIssues, twitter) {
    var logger = new Logger('jabbr/contentproviders/core'),
        object = null;

    var initialize = function () {
        return {
            activate: function () {
                captureDocumentWrite.activate();
                githubIssues.activate();
                twitter.activate();

                logger.trace('activated');
            }
        };
    };
    return function () {
        if (object === null) {
            // initialize sub-modules
            captureDocumentWrite = captureDocumentWrite();
            githubIssues = githubIssues();
            twitter = twitter();

            object = initialize();
            kernel.bind('jabbr/contentproviders/core', object);
        }

        return object;
    };
});