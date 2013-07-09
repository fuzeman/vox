/*global define*/
define([
    'jquery',
    'kernel',
    'jabbr/state',
    'jabbr/events'
], function ($, kernel, state, events) {
    function processResult($plexrResult, service) {
        var $serviceDetails = $plexrResult.find(service);

        if (service === 'spotify') {
            return "<iframe src=\"https://embed.spotify.com/?uri=" + $serviceDetails.text() + "\" width=\"300\" height=\"380\" " +
                    "frameborder=\"0\" allowtransparency=\"true\"></iframe>";
        } else if (service === 'rdio') {
            return "<iframe width=\"500\" height=\"250\" src=\"https://rd.io/i/" + $serviceDetails.text() + "//?source=oembed\" " +
                    "frameborder=\"0\"></iframe>";
        }
        return null;
    }

    return function () {
        var processor = kernel.get('jabbr/messageprocessors/processor'),
            rc = kernel.get('jabbr/components/rooms.client');

        processor.bind(events.processor.beforeProcessRichContent, function (event, handler) {
            var $content = $(handler.get());
            var $plexrResult = $("PlexrContentProviderResult", $content);

            if ($plexrResult.length === 1) {
                var service = state.getPreference('music_service') || 'spotify';
                var result = processResult($plexrResult, service);

                if (result !== null) {
                    $("PlexrContentProviderResult", $content).replaceWith(result);

                    $('.collapsible_title', $content).text(
                        service.charAt(0).toUpperCase() + service.slice(1) +
                            ' (Plexr) (click to show/hide)'
                    );
                } else {
                    $("PlexrContentProviderResult", $content).replaceWith("An error occured while trying to process the content.");
                }

                handler.set($content[0].outerHTML);
            }
        });
    };
});