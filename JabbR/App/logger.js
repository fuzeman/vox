define([
    'stacktrace'
], function () {
    function Logger(tag) {
        this.tag = tag;
    }

    Logger.prototype.traceEnabled = false;

    var levels = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4
    }
    Logger.prototype.LEVEL = levels;
    
    function toLevelString(level) {
        if (level == levels.TRACE) {
            return "TRACE";
        } else if (level == levels.DEBUG) {
            return "DEBUG";
        } else if (level == levels.INFO) {
            return "INFO";
        } else if (level == levels.WARN) {
            return "WARN";
        } else if (level == levels.ERROR) {
            return "ERROR";
        } else {
            return "?";
        }
    }
    
    function replicate(len, ch) {
        return Array(len + 1).join(ch || ' ');
    }

    function padRight(text, len, ch) {
        ch = typeof ch !== 'undefined' ? ch : ' ';
        
        if (text.length == len)
            return text;
        
        if (text.length > len)
            return text.slice(0, len);
        
        return text + replicate(len - text.length, ch);
    }
    
    function padLeft(text, len, ch) {
        ch = typeof ch !== 'undefined' ? ch : ' ';

        if (text.length == len)
            return text;

        if (text.length > len)
            return text.slice(-len);

        return replicate(len - text.length, ch) + text;
    }
    
    function getCaller() {
        var trace = printStackTrace();
        var foundLoggerTrace = false;
        var callerTrace = null;
        
        for (var i = 0; i < trace.length; i++) {
            if (!foundLoggerTrace) {
                if (trace[i].indexOf('Logger.prototype.write@') != -1) {
                    foundLoggerTrace = true;
                }
            } else {
                if (trace[i].indexOf('Logger.prototype') == -1) {
                    callerTrace = trace[i];
                    break;
                }
            }
        }
        
        if (callerTrace != null) {
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
            }
        }


        return null;
    }

    Logger.prototype.write = function (level, message) {
        if (this.traceEnabled) {
            var caller = getCaller();
            
            console.log(
                "[" + padRight(this.tag, 32) + "]  " +
                "[" + padRight(caller.filename, 12) + "]:" + padRight(caller.line, 4) + "  " +
                "(" + padRight(toLevelString(level), 5) + ")    " + message
            );
        } else {
            console.log(
                "[" + padRight(this.tag, 32) + "]  " +
                "(" + padRight(toLevelString(level), 5) + ")    " + message
            );
        }
    }
    
    Logger.prototype.trace = function (message) {
        this.write(levels.TRACE, message);
    }
    
    Logger.prototype.debug = function(message) {
        this.write(levels.DEBUG, message);
    }
    
    Logger.prototype.info = function(message) {
        this.write(levels.INFO, message);
    }
    
    Logger.prototype.warn = function(message) {
        this.write(levels.WARN, message);
    }
    
    Logger.prototype.error = function(message) {
        this.write(levels.ERROR, message);
    }

    return Logger;
});