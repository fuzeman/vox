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
            return "<iframe src=\"https://embed.spotify.com/?uri=" + $serviceDetails.text() +
                    "\" width=\"300\" height=\"380\" " +
                    "frameborder=\"0\" allowtransparency=\"true\"></iframe>";
        } else if (service === 'rdio') {
            return "<iframe width=\"500\" height=\"250\" src=\"https://rd.io/i/" + $serviceDetails.text() +
                    "//?source=oembed\" " +
                    "frameborder=\"0\"></iframe>";
        }
        return null;
    }

    return function () {
        var processor = kernel.get('jabbr/messageprocessors/processor'),
            rc = kernel.get('jabbr/components/rooms.client'),
            cs = kernel.get('jabbr/components/client-settings'),
            $musicServiceDropdown = $('#music-service-dropdown');

        // Set default to spotify
        if (state.getPreference('music_service') === undefined) {
            state.setPreference('music_service', "spotify");
        }

        // Select current item
        $('li.' + state.getPreference('music_service'), $musicServiceDropdown).addClass('active');

        // Process rich content
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
                    $("PlexrContentProviderResult", $content).replaceWith(
                        "An error occured while trying to process the content.");
                }

                handler.set($content[0].outerHTML);
            }
        });

        // Handle dropdown changes
        $('li a', $musicServiceDropdown).click(function (e) {
            var li = $(this).parent();

            // TODO: This is pretty dirty, Rewrite later.
            if (li.hasClass('spotify')) {
                if (state.getPreference('music_service') != 'spotify') {
                    state.setPreference('music_service', 'spotify');
                    $('li.rdio', $musicServiceDropdown).removeClass('active');
                    $('li.spotify', $musicServiceDropdown).addClass('active');
                }
            } else if (li.hasClass('rdio')) {
                if (state.getPreference('music_service') != 'rdio') {
                    state.setPreference('music_service', 'rdio');
                    $('li.rdio', $musicServiceDropdown).addClass('active');
                    $('li.spotify', $musicServiceDropdown).removeClass('active');
                }
            }
        });
    };
});