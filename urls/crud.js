'use strict';

var express = require('express');
var router = express.Router();
var util = require("util");

var gcloud = require('gcloud');
var config = require('../config');
var _ = require('lodash');

function getModel () {
  return require('./model-' + config.get('DATA_BACKEND'));
}
var oauth2 = require('../lib/oauth2');
router.use(oauth2.template);
function inspectPrint (obj){
  console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

router.get('/', oauth2.required, function (req, res) {
  console.log("req.user "+req.user);
  var page = 0 ;

  getModel().listBy(
    req.user.id,
    10,
    page,
    function (err, entities, cursor, apiResponse) {
      if (err) {
        inspectPrint(err);
        return res.render('index', {
          title: 'Shortern me',
          errors: err
        });
      }
      inspectPrint(entities);
      console.log(util.inspect(entities, {showHidden: false, depth: null}));
      console.log("(*****)!");

      getModel().readCount(req.user.id, function(err, data){
        if (err) {
          console.log("err of get count");
          inspectPrint( err);
          return;
        }
        res.render('index', {
          title: 'short me',
          items: entities,
          counts: data
        });
      });

    }
  );
});

router.get('/:code',  function (req, res) {
  var code = req.params.code;
  getModel().readCode(code, function (err, data) {
    if (err || _.isEmpty(data) ) {
      console.log( err );
      return res.render('index', {
        title: 'Shortern me',
        errors: err
      });
    }
    var urlData = data;
    if (_.isArray(data)){
      urlData = data[0];
    }
    console.log("REDIRECTED : "+ makeURL(urlData.url));
    //res.redirect(makeURL(urlData.url));
    getModel().addVisit( req, urlData, function(err, data){
      if (err) {
        console.log("err of add count");
        return;
      }
      console.log("ADD visit");
    });
  });
});
function makeURL ( url ){
  if ( !_.startsWith(url, 'http')){
    return "http://"+url;
  }
  return url;
}
function updateCount ( id, code, data ){

}

router.post('/',  function (req, res, next) {
  console.log("Posted");
  var data = req.body;
  console.log(util.inspect(data, {showHidden: false, depth: null}));

  // If the user is logged in, set them as the creator of the book.
  if (req.user) {
    data.owner = req.user.displayName;
    data.ownerId = req.user.id;
  } else {
    data.ownerId = 'Anonymous';
  }

  getModel().create(data, function (err, savedData) {
    if (err) {
      console.log( err );

      return res.render('index', {
        title: 'Shortern me',
        errors: err
      });
    }

    console.log( savedData );
    // res.redirect(req.baseUrl + '/' + savedData.id);
    res.render('index', {
      title: 'shorted me',
      saved: savedData
    });
  });

});

module.exports = router;
