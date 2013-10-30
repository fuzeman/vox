/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel'
], function ($, Logger, kernel) {
    var logger = new Logger('jabbr/contentproviders/twitter'),
        ru = null,
        object = null;

    var initialize = function () {
        function addTweet(tweet) {
            // Keep track of whether we're near the end, so we can auto-scroll once the tweet is added.
            var nearEnd = ru.isNearTheEnd(),
                elements = null,
                tweetSegment = '/statuses/',
                id = tweet.url.substring(tweet.url.indexOf(tweetSegment) + tweetSegment.length);


            // Grab any elements we need to process.
            elements = $('div.tweet_' + id)
            // Strip the classname off, so we don't process this again if someone posts the same tweet.
            .removeClass('tweet_' + id);

            // Process the template, and add it in to the div.
            $('#tweet-template').tmpl(tweet).appendTo(elements);

            // If near the end, scroll.
            if (nearEnd) {
                ru.scrollToBottom();
            }
        }

        window.addTweet = addTweet;

        return {
            activate: function () {
                ru = kernel.get('jabbr/components/rooms.ui');

                logger.trace('activated');
            },

            addTweet: addTweet
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/contentproviders/twitter', object);
        }

        return object;
    };
});