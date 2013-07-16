/*global Storage*/
define([
    'jquery',
    'logger',
    'kernel',
    'json2'
], function($, Logger, kernel) {
    var logger = new Logger('jabbr/components/client-settings'),
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var events = {
                changed: 'jabbr.clientSettings.changed'
            },
            $this = $(this),
            $popup = $('#jabbr-client-settings'),
            $popupButton = $('#preferences .client-settings'),
            $saveButton = $('.save-button', $popup),
            $cancelButton = $('.cancel-button', $popup),
            open = false,
            data = {};

        function trigger (eventType, parameters) {
            $this.trigger(eventType, parameters);
        }

        function show () {
            $popup.modal('show');
            open = true;
        }
        
        function hide () {
            $popup.modal('hide');
            open = false;
        }
        
        function findElements () {
            return $('input,select', $popup);
        }
        
        function disableAll (error) {
            $saveButton.attr('disabled', '');
            $cancelButton.attr('disabled', '');
            $('input,select', $popup).attr('disabled', '');
            findElements().text(error);
        }
        
        function save () {
            localStorage.cs = JSON.stringify(data);
        }

        function store (triggerChanged) {
            triggerChanged = typeof triggerChanged !== 'undefined' ? triggerChanged : true;

            findElements().each(function () {
                if ($(this).attr('id') !== undefined) {
                    data[$(this).attr('id')] = $(this).val();
                    logger.trace("stored ['" + $(this).attr('id') + "'] = '" + $(this).val() + "'");
                } else {
                    logger.warn("'" + $(this).html() + "' has no id specified");
                }
            });

            save();

            if (triggerChanged) {
                trigger(events.changed);
            }
        }
        
        function reset () {
            data = {};
            
            if (localStorage.cs !== undefined) {
                data = JSON.parse(localStorage.cs);
            }
            
            findElements().each(function () {
                if ($(this).attr('id') !== undefined) {
                    if (data[$(this).attr('id')] !== undefined) {
                        $(this).val(data[$(this).attr('id')]);
                    } else {
                        logger.warn("No previous setting stored for '" + $(this).attr('id') + "'");
                    }
                } else {
                    logger.warn("'" + $(this).html() + "' has no id specified");
                }
            });
        }
        
        // If Local Storage isn't available, disable all the controls
        if (typeof(Storage) == "undefined") {
            disableAll("Local Storage not available");
        } else {
            reset();
        }

        $popupButton.click(show);
        
        $saveButton.click(function () {
            store();
            hide();
        });
        
        $cancelButton.click(function () {
            reset();
            hide();
        });
        
        $popup.on('show', function () {
            $('.tab-pane', $popup).first().addClass('active');
            $('.nav-tabs li', $popup).first().addClass('active');
            reset();
        });

        $popup.on('hidden', function () {
            $('.tab-pane', $popup).removeClass('active');
            $('.nav-tabs li', $popup).removeClass('active');
        });

        return {
            events: events,
            
            activate: function () {
                logger.trace('activated');
            },
            isOpen: function () {
                return open;
            },
            reset: reset,
            save: save,
            
            get: function (key) {
                return data[key];
            },
            set: function (key, value) {
                data[key] = value;
                save();
            },
            
            bind: function (eventType, handler) {
                $this.bind(eventType, handler);
            }
        }
    };

    return function () {
        if(object === null) {
            object = initialize();
            kernel.bind('jabbr/components/client-settings', object);
        }

        return object;
    };
});