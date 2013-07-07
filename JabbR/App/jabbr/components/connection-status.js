/*global define, clearTimeout*/
define([
    'jabbr/client',
    'jabbr/ui',
    'jabbr/events',
    'jquery',
    'logger',

    'bootstrap'
], function (client, ui, events, $, Logger) {
    var logger = new Logger('jabbr/components/connection-status');
    logger.trace('loaded');

    var $connectionStatus = $('#connectionStatus'),
        $connectionStateChangedPopover = $('#connection-state-changed-popover'),
        $connectionInfoPopover = $('#connection-info-popover'),
        $connectionInfoContent = $('#connection-info-content');

    var connectionState = -1,
        connectionStateIcon = '#popover-content-icon',
        connectionInfoStatus = '#connection-status',
        connectionInfoTransport = '#connection-transport',
        popoverTimer = null;

    function getStateChangedPopoverOptions(statusText) {
        var options = {
            html: true,
            trigger: 'hover',
            template: $connectionStateChangedPopover,
            content: function () {
                return statusText;
            }
        };
        return options;
    }

    function getInfoPopoverOptions(transport) {
        var options = {
            html: true,
            trigger: 'hover',
            delay: {
                show: 0,
                hide: 500
            },
            template: $connectionInfoPopover,
            content: function () {
                var connectionInfo = $connectionInfoContent;
                connectionInfo.find(connectionInfoStatus).text('Status: Connected');
                connectionInfo.find(connectionInfoTransport).text('Transport: ' + transport);
                return connectionInfo.html();
            }
        };
        return options;
    }

    function initializeConnectionStatus(transport) {
        $connectionStatus.popover(getInfoPopoverOptions(transport));
    }

    function showStatus(status, transport) {
        // Change the status indicator here
        if (connectionState !== status) {
            if (popoverTimer) {
                clearTimeout(popoverTimer);
            }

            connectionState = status;
            $connectionStatus.popover('destroy');

            switch (status) {
                case 0:
                    // Connected
                    $connectionStatus.removeClass('reconnecting disconnected');
                    $connectionStatus.popover(getStateChangedPopoverOptions('You\'re connected.'));
                    $connectionStateChangedPopover.find(connectionStateIcon).addClass('icon-ok-sign');
                    $connectionStatus.popover('show');
                    popoverTimer = setTimeout(function () {
                        $connectionStatus.popover('destroy');
                        initializeConnectionStatus(transport);
                        popoverTimer = null;
                    }, 2000);
                    break;
                case 1:
                    // Reconnecting
                    $connectionStatus.removeClass('disconnected').addClass('reconnecting');
                    $connectionStatus.popover(getStateChangedPopoverOptions('The connection to JabbR has been temporarily lost, trying to reconnect.'));
                    $connectionStateChangedPopover.find(connectionStateIcon).addClass('icon-question-sign');
                    $connectionStatus.popover('show');
                    popoverTimer = setTimeout(function () {
                        $connectionStatus.popover('hide');
                        popoverTimer = null;
                    }, 5000);
                    break;
                case 2:
                    // Disconnected
                    $connectionStatus.removeClass('reconnecting').addClass('disconnected');
                    $connectionStatus.popover(getStateChangedPopoverOptions('The connection to JabbR has been lost, trying to reconnect.'));
                    $connectionStateChangedPopover.find(connectionStateIcon).addClass('icon-exclamation-sign');
                    $connectionStatus.popover('show');
                    popoverTimer = setTimeout(function () {
                        $connectionStatus.popover('hide');
                        popoverTimer = null;
                    }, 5000);
                    break;
            }
        }
    }

    client.bind(events.client.reconnecting, function () {
        logger.info('reconnecting');

        //failPendingMessages();
        showStatus(1, '');
    });

    client.bind(events.client.connected, function (event, change, initial) {
        logger.info('connected');

        if (!initial) {
            showStatus(0, $.connection.hub.transport.name);
        } else {
            initializeConnectionStatus($.connection.hub.transport.name);
        }
    });

    client.bind(events.client.disconnected, function () {
        //failPendingMessages();

        showStatus(2, '');
    });
});