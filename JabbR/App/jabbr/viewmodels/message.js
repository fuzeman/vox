define([
    'jabbr/client',
    'jabbr/utility',
    'jabbr/templates'
], function(client, utility, templates) {

    function processContent(ru, content) {
        return utility.processContent(content, templates, ru.roomCache);
    }

    function Message(ru, data) {
        var reUsername = new RegExp("\\b@?" + client.chat.state.name.replace(/\./, '\\.') + "\\b", "i");
        //var reCustom = new RegExp(customMentionRegex, "i");

        this.name = data.User.Name;
        this.hash = data.User.Hash;
        this.mention = data.User.Mention;
        this.message = data.HtmlEncoded ? data.Content : processContent(ru, data.Content);
        this.htmlContent = data.HtmlContent;
        this.id = data.Id;
        this.date = data.When.fromJsonDate();
        //this.highlight: (reUsername.test(data.Content) || reCustom.test(data.Content)) ? 'highlight' : '',
        this.highlight = reUsername.test(data.Content) ? 'highlight' : '';
        this.isOwn = reUsername.test(data.User.name);
        this.isMine = data.User.Name === client.chat.state.name;
        this.isHistory = 'isHistory' in data ? data.isHistory : false;
        this.imageUrl = data.ImageUrl;
        this.source = data.Source;
        this.messageType = data.MessageType;
    }

    return Message;
});