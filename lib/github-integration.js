'use strict';
/*jshint node: true*/
const passGenerator       = require('./pass-generator'),
      GitHubStrategy      = require('passport-github2').Strategy,
      redirectDestination = require('./redirect-destination');




function passportGitHubAuth(passport, app, db, setup) {
  if (!setup.github.clientId) return;
  const User = db.model('User');

  app.locals.authProviders.github = {
    authPath: '/auth/github',
    name: 'GitHub'
  };

  // Use the GitHubStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and GitHub
  //   profile), and invoke a callback with a user object.
  passport.use(new GitHubStrategy({
      clientID: setup.github.clientId,
      clientSecret: setup.github.clientSecret,
      callbackURL: setup.webAppBaseURL + '/auth/github/callback',
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {
      var account = {
        provider: 'github',
        providerUserId: profile.username,
        auth: {
          accessToken: accessToken,
          refreshToken: refreshToken
        },
        profile: profile
      };

      function replaceAccount(user) {
        var accounts = user.accounts;

        for (var a = 0; a < accounts.length; a++) {
          if (accounts[a].provider === account.provider &&
              accounts[a].providerUserId === account.providerUserId) {
            user.accounts.splice(a, 1);
          }
        }

        user.accounts.unshift(account);
        return user.save(done);
      }

      User.findOneByProvider('github', profile.username, function(err, existingUser) {
        if (err) return done(err);
        if (existingUser) {
          if (req.isAuthenticated()) {
            // replace the provider account of logged in user
            if (req.user._id === existingUser._id) {
              return replaceAccount(req.user);
            }
            req.flash('error', 'Cannot associate GH account owned by an other user.');
            return req.res.redirect('/account');
          }

          // login in as existing user
          req.flash('info', 'You are now logged in.');
          return replaceAccount(existingUser);
        }

        // add the provider account to logged in user
        else if (req.isAuthenticated()) {
          req.flash('info', 'Your GitHub account has been connected.');
          req.user.accounts.push(account);
          return req.user.save(done);
        }

        var newUser = new User({
          displayName: profile.displayName,
          username: profile.username,
          accounts: [account]
        });

        req.flash('info', 'You successfully register with your GitHub account.');
        return User.register(newUser, passGenerator(), function(err) {
          if (err) return done(err);
          return newUser.save(done);
        });
      });
    }
  ));

  // GET /auth/github
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in GitHub authentication will involve redirecting
  //   the user to github.com.  After authorization, GitHub will redirect the user
  //   back to this application at /auth/github/callback
  app.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email' ] }));

  // GET /auth/github/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function will be called,
  //   which, in this example, will redirect the user to the home page.
  app.get('/auth/github/callback',
    passport.authenticate('github', {
      failureRedirect: '/login',
      failureFlash: 'Something went wrong.'
    }),
    function(req, res) {
      redirectDestination(req, res, '/account');
    });

  app.post('/webhook/github', function(req, res) {
    res.send(200);
  });
}


module.exports = {
  passport: passportGitHubAuth
};