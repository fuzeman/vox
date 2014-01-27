/*global define*/
define([
    'jquery',
    'hljs',
    'jabbr/templates'
], function ($, hljs, templates) {
    var language_titles = {        
        'coffeescript': 'CoffeeScript',
        'cpp': 'C++',
        'cs': 'C#',
        'css': 'CSS',
        'http': 'HTTP',
        'ini': 'INI',
        'javascript': 'JavaScript',
        'json': 'JSON',
        'xml': 'XML',
        'objectivec': 'Objective-C',
        'php': 'PHP',
        'sql': 'SQL'
    };
    
    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    function countIndentation(lines) {
        var minSpaces = -1,
            minTabs = -1;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i],
                spaces = 0,
                tabs = 0;

            for (var c = 0; c < line.length; c++) {
                if (line[c] == ' ') {
                    spaces += 1;
                } else if (line[c] == '\t') {
                    tabs += 1;
                } else {
                    break;
                }
            }

            // If line didn't contain just spaces and tabs
            if (line.length != spaces + tabs) {
                // Update spaces
                if (minSpaces == -1 || spaces < minSpaces) {
                    minSpaces = spaces;
                }

                // Update tabs
                if (minTabs == -1 || tabs < minTabs) {
                    minTabs = tabs;
                }
            }
        }

        return {
            spaces: minSpaces,
            tabs: minTabs
        };
    }

    function normalizeIndentation(lines) {
        if (lines.length == 1) {
            return lines;
        }

        var count = countIndentation(lines);
        
        // Mixed tabs and spaces, not supported
        if (count.spaces > 0 && count.tabs > 0) {
            return lines;
        }
        
        // Normalize
        for (var i = 0; i < lines.length; i++) {
            if (count.spaces > 0 && lines[i].length >= count.spaces) {
                lines[i] = lines[i].slice(count.spaces);
            } else if (count.tabs > 0 && lines[i].length >= count.tabs) {
                lines[i] = lines[i].slice(count.tabs);
            }
        }

        return lines;
    }
    
    function getTitle(language) {
        if (language in language_titles) {
            return language_titles[language];
        }

        return toTitleCase(language);
    }

    function processContent(content) {
        var value = $("<div/>").html(content).text(),
            lines = value.split('\n');
        
        // Ensure code is left-aligned
        lines = normalizeIndentation(lines);
        
        var result = hljs.highlightAuto(lines.join('\n')),
            score = result.r + result.keyword_count;

        if (score > 5) {
            return $('<div />').append(templates.code.tmpl({
                title: getTitle(result.language),
                value: result.value,
                lines: lines
            })).html();
        }

        return null;
    }

    return {
        processContent: processContent
    };
});