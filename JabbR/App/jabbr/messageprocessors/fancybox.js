define([
    'jabbr/events',
    'jquery',
    
    'jquery.fancybox'
], function (events, $) {
    return function (processor, ru) {
        processor.bind(events.processor.afterRichElementAttached, function (event, $middle) {
            console.log('fancybox attached');
            console.log($middle);
            var $imageContent = $('a.imageContent', $middle);
            console.log($imageContent);
            $imageContent.fancybox({
                /*openEffect: 'elastic',
                openSpeed: 400,

                closeEffect: 'elastic',
                closeSpeed: 200,

                helpers: {
                    overlay: {
                        closeClick: true
                    }
                }*/
            });
        });
    }
});