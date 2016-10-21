// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START app]
'use strict';

// [START setup]
var express = require('express');
var session = require('express-session');
var MemcachedStore = require('connect-memcached')(session);
var passport = require('passport');

var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config');

var oauth2 = require('./lib/oauth2');
var app = express();

var util = require("util");
var nconf = require('nconf');
var useragent = require('express-useragent');
app.enable('trust proxy');
// [END setup]

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(useragent.express());
app.locals.moment = require('moment');
app.locals._      = require('lodash');

app.locals.evar = function(key){ if ( nconf.get(key)) {return nconf.get(key) } else return ; };

function inspectPrint (obj){
  console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

// Configure the session and session storage.
var sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: config.get('SESSION_SECRET'),
  signed: true
};
// In production use the App Engine Memcache instance to store session data,
// otherwise fallback to the default MemoryStore in development.
if (config.get('NODE_ENV') === 'production') {
  sessionConfig.store = new MemcachedStore({
    hosts: [config.get('MEMCACHE_URL')]
  });
}
app.use(session(sessionConfig));
// OAuth2
app.use(passport.initialize());
app.use(passport.session());


app.use('/login*', function(req, res, next){
  res.redirect('/auth/google');
});

app.use('/auth', oauth2.router);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/urls', require('./urls/crud'));

app.get('/profile', function (req, res) {
  console.log("IN profile");
  console.log(util.inspect(req.user, {showHidden: false, depth: null}) );
  res.render('profile', {
    title: 'Hello',
    user: req.user
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
// [END app]

module.exports = app;
