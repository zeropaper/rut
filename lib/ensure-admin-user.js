'use strict';
/*jshint node: true*/
module.exports = function ensureAdminUser(db, password, next) {
  const User = db.model('User');

  User.findByUsername('admin', function(err, adminUser) {
    if (err) return next(err);

    if (!adminUser) {
      adminUser = new User({
        name: {
          first: 'Admin',
          last: 'Inistrator'
        },
        username: 'admin',
        roles: ['admin']
      });

      return User.register(adminUser, password, function(err/*, createdAdminUser*/) {
        if (err) console.warn('Admin User Creation Error: ' + err.stack);
        next();
      });
    }

    adminUser.setPassword(password, function(err) {
      if (err) return next(err);
      adminUser.roles = ['admin'];
      return adminUser.save(next);
    });
  });
};