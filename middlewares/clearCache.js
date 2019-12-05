const { clearHash } = require('../services/cache.js');

module.exports = async (req, res, next) => {
    await next();

    clearHash(req.user.id);
};