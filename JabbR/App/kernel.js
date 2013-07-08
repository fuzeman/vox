define([
    'logger'
], function (Logger) {
    var logger = new Logger('kernel'),
        objects = {};

    return {
        bind: function (name, object) {
            logger.trace('bind "' + name + "' = " + object);

            if (name in objects) {
                logger.warn('object with the name "' + name + '" already bound');
            }

            objects[name] = object;
        },
        get: function (name) {
            if (!(name in objects)) {
                logger.warn('object with the name "' + name + '" does not exist');
            }

            return objects[name];
        }
    }
});