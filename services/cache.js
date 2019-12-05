const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');
const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);



// stores references to original function
const exec = mongoose.Query.prototype.exec;
mongoose.Query.prototype.cache = async function (options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
};

// arrow function not used since it messes the this
mongoose.Query.prototype.exec = async function () {
    if(!this.useCache) {
        return exec.apply(this, arguments);
    }
    // this is reference to current query we are trying to execute
    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }));
    // See if value for key exists in redis
    const cachedValue = await client.hget(this.hashKey, key);
    // If the cached value exists
    if (cachedValue) {
        const doc = JSON.parse(cachedValue);
        return Array.isArray(doc) ? doc.map(d => new this.model(d))  : new this.model(doc);
    }
    // execute the original untouched copy of exec
    const result = await exec.apply(this, arguments);
    client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
    return result;
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
}