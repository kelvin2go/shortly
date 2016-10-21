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

'use strict';

var express = require('express');
var router = express.Router();
var oauth2 = require('../lib/oauth2');
router.use(oauth2.template);

var exculdeRoute = {urls: '/urls'};

// [START hello_world]
router.get('/', function (req, res) {
  res.render('index', {
    title: 'Hello'
  });
});
// [END hello_world]
router.get('/r/:code', function (req, res) {
  var redirectPath ='/urls/'+ req.params.code;
  res.redirect(redirectPath);
});

module.exports = router;
