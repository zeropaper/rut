'use strict';
/*jshint node: true*/
const env              = process.env,
      passGenerator    = require('./pass-generator'),
      GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
      webPort          = env.NODE_PORT || 3000,
      webHost          = env.OPENSHIFT_APP_DNS || 'localhost',
      webAppBaseURL    = 'http' + (webHost === 'localhost' ? '' : 's') + '://' + webHost + (webHost === 'localhost' ? ':' + webPort : ''),
      GG_CLIENT_ID     = env.GG_CLIENT_ID,
      GG_CLIENT_SECRET = env.GG_CLIENT_SECRET;




function passportGoogleAuth(passport, app, db) {
  if (!GG_CLIENT_ID) return;
  const User = db.model('User');

  app.locals.authProviders = app.locals.authProviders || {};
  app.locals.authProviders.google = {
    authPath: '/auth/google',
    name: 'Google'
  };

  // Use the GoogleStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and Google
  //   profile), and invoke a callback with a user object.
  passport.use(new GoogleStrategy({
      clientID: GG_CLIENT_ID,
      clientSecret: GG_CLIENT_SECRET,
      callbackURL: webAppBaseURL + '/auth/google/callback'
    },
    function(accessToken, refreshToken, profile, done) {
      User.findOneByProvider('google', profile.id, function(err, user) {
        if (err) return done(err);
        if (user) {
          var account = user.accounts.find(accounts => accounts.provider === 'google');
          account.auth = {
            accessToken: accessToken,
            refreshToken: refreshToken
          };
          account.profile = profile;
          return user.save(done);
        }

        return User.findOne({username: profile.id}, function(err, found) {
          if (err) return done(err);
          if (found) return done(new Error('User with username ' + profile.id + ' already exists'));

          var newUser = new User({
            username: profile.id,
            accounts: [{
              provider: 'google',
              providerUserId: profile.id,
              auth: {
                accessToken: accessToken,
                refreshToken: refreshToken
              },
              profile: profile
            }]
          });

          var password = passGenerator();
          return User.register(newUser, password, function(err) {
            if (err) return done(err);
            return newUser.save(done);
          });
        });
      });
    }
  ));

  // GET /auth/google
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in Google authentication will involve redirecting
  //   the user to google.com.  After authorization, Google will redirect the user
  //   back to this application at /auth/google/callback
  app.get('/auth/google',
    passport.authenticate('google', { scope: [ 'user:email' ] }));

  // GET /auth/google/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function will be called,
  //   which, in this example, will redirect the user to the home page.
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/login',
      failureFlash: true
    }),
    function(req, res) {
      res.redirect('/');
    });
}


module.exports = {
  passport: passportGoogleAuth
};