var db = require('../config');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  links: function() {
    return this.hasMany(Link);
  }
});

module.exports = User;
