/*global define, window*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/core/utility'
], function ($, Logger, kernel, utility) {
    var logger = new Logger('jabbr/contentproviders/github-issues'),
        ru = null,
        object = null;

    var initialize = function () {
        function addGitHubIssue(issue) {
            if (!issue.data.user) {
                return;
            }

            // Keep track of whether we're need the end, so we can auto-scroll once the tweet is added.
            var nearEnd = ru.isNearTheEnd(),
                elements = null;

            elements = $('div.git-hub-issue-' + issue.data.number)
                .removeClass('git-hub-issue-' + issue.data.number);


            issue.data.body = utility.markdownToHtml(utility.encodeHtml(issue.data.body));

            // Process the template, and add it in to the div.
            var $issue = $('#github-issues-template').tmpl(issue.data);

            if ($issue.length > 0) {
                $issue.appendTo(elements);

                // After the string has been added to the template etc, remove any existing targets and re-add with _blank
                $('a', elements).removeAttr('target').attr('target', '_blank');

                $('.js-relative-date').timeago();
                // If near the end, scroll.
                if (nearEnd) {
                    ru.scrollToBottom();
                }
                elements.append('<script src="https://api.github.com/users/' + issue.data.user.login + '?callback=addGitHubIssuesUser"></script>');
                if (issue.data.assignee) {
                    elements.append('<script src="https://api.github.com/users/' + issue.data.assignee.login + '?callback=addGitHubIssuesUser"></script>');
                }
            } else {
                logger.warn('missing github issue template');
            }
        }

        function addGitHubIssueComment(comment) {
            var nearEnd = ru.isNearTheEnd(),
                elements = null;

            elements = $('div.git-hub-issue-' + comment.data.id)
                .removeClass('git-hub-issue-' + comment.data.id);


            comment.data.body = utility.markdownToHtml(utility.encodeHtml(comment.data.body));
            // Process the template, and add it in to the div.
            var $comment = $('#github-issues-comment-template').tmpl(comment.data);

            if ($comment.length > 0) {
                $comment.appendTo(elements);

                // After the string has been added to the template etc, remove any existing targets and re-add with _blank
                $('a', elements).removeAttr('target').attr('target', '_blank');

                $('.js-relative-date').timeago();
                // If near the end, scroll.
                if (nearEnd) {
                    ru.scrollToBottom();
                }
            } else {
                logger.warn('missing github comment template');
            }
        }

        function addGitHubIssuesUser(user) {
            var elements = $("a.github-issue-user-" + user.data.login);
            elements.attr("href", user.data.html_url);
        }

        window.addGitHubIssue = addGitHubIssue;
        window.addGitHubIssueComment = addGitHubIssueComment;
        window.addGitHubIssuesUser = addGitHubIssuesUser;

        return {
            activate: function () {
                ru = kernel.get('jabbr/components/rooms.ui');

                logger.trace('activated');
            },

            addGitHubIssue: addGitHubIssue,
            addGitHubIssueComment: addGitHubIssueComment,
            addGitHubIssuesUser: addGitHubIssuesUser
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/contentproviders/github-issues', object);
        }

        return object;
    };
});