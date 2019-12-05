const mongosse = require('mongoose');
const User = mongosse.model('User');

module.exports = () => {
    return new User({}).save();
};