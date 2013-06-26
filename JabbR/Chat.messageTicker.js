var MessageTicker = {};

(function ($, window) {
    var $messageTicker = $('#message-ticker');
    var maxMessages = 5;
    var removeOldMessagesInterval = 5000;  // 5s
    var messageDisplayTime = 25000;  // 25s

    MessageTicker.getMessages = function() {
        return $("li", $messageTicker);
    };

    MessageTicker.appendMessage = function (message, roomName) {
        var isCollapsible = message.message.indexOf('<div class="collapsible_content">') != -1;
        var messageContent = "";
        
        if (!isCollapsible) {
            messageContent = '<span class="message"> - ' + message.message + '</span>';
        }

        var $newTickerMessage = $(
            '<li class="appending"><div class="inner">' +
                '#' + roomName + ' ' +
                message.name +
                messageContent +
            '</div></li>'
        );
        
        if (message.highlight != "") {
            $newTickerMessage.addClass('highlight');
        }

        $newTickerMessage.appendTo($messageTicker);
        $newTickerMessage.data('timestamp', new Date().getTime());

        var $messages = MessageTicker.getMessages();
        var numRemove = $messages.length - maxMessages;
        
        if (numRemove > 0) {
            MessageTicker.removeMessage($messages.slice(0, numRemove));
        }

        $newTickerMessage.animate({
                height: 20
            }, 1000, function() {
                $(this).removeClass('appending');
                $(this).css('height', '');
            });
    };

    MessageTicker.removeMessage = function ($message) {
        $message
            .css('border-top', 'none')
            .animate({
                opacity: 0
            }, 500, function() {
                $(this).remove();
            });
    };

    MessageTicker.removeOldMessages = function () {
        var currentTimestamp = new Date().getTime();
        var $messages = MessageTicker.getMessages();
        
        for (var i = 0; i < $messages.length; i++) {
            var $message = $($messages[i]);
            var span = currentTimestamp - $message.data('timestamp');
            
            if (span > messageDisplayTime) {
                MessageTicker.removeMessage($message);
            }
        }

        setTimeout(MessageTicker.removeOldMessages, removeOldMessagesInterval);
    };
    setTimeout(MessageTicker.removeOldMessages, removeOldMessagesInterval);
})(jQuery, window);