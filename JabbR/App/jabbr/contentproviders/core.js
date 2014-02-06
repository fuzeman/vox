/*global define, document, setInterval*/
define([
    'jquery',
    'logger',
    'kernel',

    'jabbr/contentproviders/capture-document-write',
    'jabbr/contentproviders/github-issues',
    'jabbr/contentproviders/reddit',
    'jabbr/contentproviders/twitter'
], function($, Logger, kernel, captureDocumentWrite, githubIssues, reddit, twitter) {
    var logger = new Logger('jabbr/contentproviders/core'),
        object = null;

    window.contentproviders = {};

    var initialize = function () {
        return {
            activate: function () {
                captureDocumentWrite.activate();
                githubIssues.activate();
                reddit.activate();
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
            reddit = reddit();
            twitter = twitter();

            object = initialize();
            kernel.bind('jabbr/contentproviders/core', object);
        }

        return object;
    };
});