/*global define, Storage*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/core/events',
    'json2'
], function ($, Logger, kernel, events) {
    var logger = new Logger('jabbr/components/client-settings'),
        client = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var csEvents = {
            changed: 'jabbr.clientSettings.changed'
        },
            $this = $(this),
            $popup = $('#jabbr-client-settings'),
            $popupButton = $('#preferences .client-settings'),
            $saveButton = $('.save-button', $popup),
            $cancelButton = $('.cancel-button', $popup),
            $stateCheckboxes = $('.control-group input[type="checkbox"].state', $popup),
            open = false,
            data = {},
            preferences = {};

        function trigger(eventType, parameters) {
            $this.trigger(eventType, parameters);
        }

        function show() {
            $popup.modal('show');
            open = true;
        }

        function hide() {
            $popup.modal('hide');
            open = false;
        }

        function findElements(sectionSelector) {
            sectionSelector = typeof sectionSelector !== 'undefined' ? sectionSelector : '.legacy-section';

            return $('input,select', $(sectionSelector, $popup));
        }

        function toggleGroupState() {
            var $inputElements = $('input:not(.state)', $(this).closest('.control-group'));

            if ($(this).is(':checked')) {
                $inputElements.removeAttr('disabled');
            } else {
                $inputElements.attr('disabled', '');
            }
        }

        function disableAll(error) {
            $saveButton.attr('disabled', '');
            $cancelButton.attr('disabled', '');
            $('input,select', $popup).attr('disabled', '');
            findElements('.legacy-section').text(error);
        }

        function save() {
            localStorage.cs = JSON.stringify(data);
            
            client.chat.server.updatePreferences(preferences);
        }
        
        function getSectionName($option) {
            var $section = $option.closest('.preference-section');
            
            return  $section.data('section');
        }
        
        function getElementValue(id, $element) {
            if (id === undefined) {
                logger.warn("'" + $element.html() + "' has no id specified");
                return null;
            }

            // Get element value
            if ($element.attr('type') == 'checkbox') {
                return $element.is(':checked');
            } else {
                return $element.val();
            }
        }

        function setPreference(section, attribute, value) {
            attribute = attribute.split('.');

            if (preferences[section] === null || preferences[section] === undefined) {
                preferences[section] = {};
            }
            
            var cur = preferences[section];

            $.each(attribute, function (i, segment) {
                if (i == attribute.length - 1) {
                    cur[segment] = value;
                    return;
                }

                if (cur[segment] === undefined || cur[segment] === null) {
                    cur[segment] = {};
                }

                cur = cur[segment];
            });
        }

        function getPreference(section, attribute) {
            attribute = attribute.split('.');

            if (preferences[section] === null || preferences[section] === undefined) {
                return null;
            }

            var cur = preferences[section];
            
            $.each(attribute, function (i, segment) {
                if (cur === null) {
                    return;
                }

                if (cur[segment] === undefined || cur[segment] === null) {
                    cur = null;
                    logger.warn("segment missing from preferences '" + segment + "'");
                    return;
                }

                cur = cur[segment];
            });

            return cur;
        }

        function store(triggerChanged) {
            triggerChanged = typeof triggerChanged !== 'undefined' ? triggerChanged : true;

            // Store legacy options
            findElements('.legacy-section').each(function () {
                var id = $(this).attr('id'),
                    value = getElementValue(id, $(this));
                
                if (value === null) {
                    return;
                }
                
                // Update value
                data[id] = value;
                logger.trace("stored ['" + id + "'] = '" + value + "'");
            });
            
            // Store user preference options
            findElements('.preference-section').each(function () {
                var section = getSectionName($(this)),
                    sectionData = preferences[section],
                    id = $(this).attr('id'),
                    attribute = $(this).data('attribute'),
                    value = getElementValue(id, $(this));

                if (value === null) {
                    return;
                }

                // Update the local value
                setPreference(section, attribute, value);
                logger.trace("stored ['" + section + "']." + attribute + " = '" + value + "'");
            });

            // Save options and trigger changed event
            save();
            
            if (triggerChanged) {
                trigger(csEvents.changed);
            }
        }
        
        function updateElementValue($element, id, value) {
            if (id === undefined) {
                logger.warn("'" + $element.html() + "' has no id specified");
                return;
            }

            if (value === null || value === undefined) {
                logger.warn("No previous setting stored for '" + id + "'");
                return;
            }

            if ($element.attr('type') == 'checkbox') {
                if (value === true) {
                    $element.attr('checked', '');
                } else {
                    $element.removeAttr('checked');
                }
            } else {
                $element.val(value);
            }
        }

        function reset() {
            // Load legacy settings from local storage
            data = {};
            if (localStorage.cs !== undefined) {
                data = JSON.parse(localStorage.cs);
            }
            
            // Update legacy option elements
            findElements('.legacy-section').each(function () {
                var id = $(this).attr('id'),
                    value = data[id];

                updateElementValue($(this), id, value);
            });
            
            // Update user preference option elements
            findElements('.preference-section').each(function () {
                var section = getSectionName($(this)),
                    sectionData = preferences[section],
                    id = $(this).attr('id'),
                    attribute = $(this).data('attribute');
                
                if (sectionData === undefined || sectionData === null) {
                    logger.warn("Section '" + section + "' is empty");
                    return;
                }

                updateElementValue($(this), id, getPreference(section, attribute));
            });

            $stateCheckboxes.each(toggleGroupState);
        }

        // If Local Storage isn't available, disable all the controls
        if (typeof (Storage) == "undefined") {
            disableAll("Local Storage not available");
        } else {
            reset();
        }

        $popupButton.click(show);

        $saveButton.click(function (ev) {
            ev.preventDefault();
            store();
            hide();
        });

        $cancelButton.click(function (ev) {
            ev.preventDefault();
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

        $stateCheckboxes.change(toggleGroupState);

        return {
            events: csEvents,

            activate: function () {
                client = kernel.get('jabbr/client');

                logger.trace('activated');

                client.chat.client.preferencesChanged = function (newPreferences) {
                    logger.trace('preferencesChanged');
                    
                    preferences = newPreferences;
                    reset();
                };
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
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/client-settings', object);
        }

        return object;
    };
});