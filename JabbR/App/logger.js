/*global define, window, printStackTrace, console*/
define([
    'jquery',
    'stacktrace',
    'jquery-migrate'
], function ($) {
    function Logger(tag) {
        this.tag = tag;
    }

    if (window.debug === undefined) {
        window.debug = false;
    }

    var levels = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4
    };
    Logger.prototype.LEVEL = levels;

    function toLevelString(level) {
        if (level === levels.TRACE) {
            return "TRACE";
        } else if (level === levels.DEBUG) {
            return "DEBUG";
        } else if (level === levels.INFO) {
            return "INFO";
        } else if (level === levels.WARN) {
            return "WARN";
        } else if (level === levels.ERROR) {
            return "ERROR";
        } else {
            return "?";
        }
    }

    function replicate(len, ch) {
        return (new Array(len + 1)).join(ch || ' ');
    }

    function padRight(text, len, ch) {
        ch = typeof ch !== 'undefined' ? ch : ' ';

        if (text.length === len) {
            return text;
        }

        if (text.length > len) {
            return text.slice(0, len);
        }

        return text + replicate(len - text.length, ch);
    }

    function padLeft(text, len, ch) {
        ch = typeof ch !== 'undefined' ? ch : ' ';

        if (text.length === len) {
            return text;
        }

        if (text.length > len) {
            return text.slice(-len);
        }

        return replicate(len - text.length, ch) + text;
    }

    function findCallerTrace(trace, writeTrace, endTrace) {
        var foundLoggerTrace = false;
        var callerTrace = null;

        for (var i = 0; i < trace.length; i++) {
            if (!foundLoggerTrace) {
                if (trace[i].indexOf(writeTrace) != -1) {
                    foundLoggerTrace = true;
                }
            } else {
                if (trace[i].indexOf(endTrace) == -1) {
                    callerTrace = trace[i];
                    break;
                }
            }
        }

        return callerTrace;
    }

    function parseMozillaTrace(trace) {
        var callerTrace = findCallerTrace(trace, 'Logger.prototype.write@', 'Logger.prototype');

        if (callerTrace !== null) {
            var split = callerTrace.split('@http://');

            if (split.length != 2) {
                return null;
            }

            var lineNumberSepPos = split[1].lastIndexOf(':');

            var name = split[0];
            var path = split[1].slice(split[1].indexOf('/'), lineNumberSepPos);
            var filename = path.slice(path.lastIndexOf('/') + 1);
            var line = split[1].slice(lineNumberSepPos + 1);

            return {
                name: name,
                path: path,
                filename: filename,
                line: line
            };
        }

        return null;
    }

    function parseWebkitTrace(trace) {
        var callerTrace = findCallerTrace(trace, 'at Logger.write (', 'at Logger.');

        if (callerTrace !== null) {
            callerTrace = callerTrace.replace('at', '').trim();
            var split = callerTrace.split(':');

            if (split.length < 3) {
                return null;
            }

            var path = split[split.length - 3];
            path = path.slice(path.indexOf('/'));

            var filename = path.slice(path.lastIndexOf('/') + 1);
            var line = split[split.length - 2];

            return {
                path: path,
                filename: filename,
                line: line
            };
        }

        return null;
    }

    function getCaller() {
        var trace = printStackTrace();

        if ($.browser.mozilla === true) {
            return parseMozillaTrace(trace);
        }

        if ($.browser.webkit === true) {
            return parseWebkitTrace(trace);
        }

        return null;
    }

    Logger.prototype.write = function (level, message) {
        if (window.debug) {
            var caller = getCaller();

            if (caller !== null) {
                console.log(
                    "[" + padRight(this.tag, 32) + "]  " +
                    "[" + padRight(caller.filename, 12) + "]:" + padRight(caller.line, 4) + "  " +
                    "(" + padRight(toLevelString(level), 5) + ")    " + message
                );
                return;
            }
        } else if (level != levels.TRACE) {
            console.log(
                "[" + padRight(this.tag, 32) + "]  " +
                "(" + padRight(toLevelString(level), 5) + ")    " + message
            );
        }
    };

    Logger.prototype.trace = function (message) {
        this.write(levels.TRACE, message);
    };

    Logger.prototype.debug = function (message) {
        this.write(levels.DEBUG, message);
    };

    Logger.prototype.info = function (message) {
        this.write(levels.INFO, message);
    };

    Logger.prototype.warn = function (message) {
        this.write(levels.WARN, message);
    };

    Logger.prototype.error = function (message) {
        this.write(levels.ERROR, message);
    };

    return Logger;
});