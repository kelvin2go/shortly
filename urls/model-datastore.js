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

var gcloud = require('gcloud');
var config = require('../config');
var shortid = require("shortid");
var util = require("util");
var _ = require('lodash');

// [START config]
var ds = gcloud.datastore({
  projectId: config.get('GCLOUD_PROJECT')
});
var kind = 'url';
var kind_visit = 'url_visit';
// [END config]
function inspectPrint (obj){
  console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore (obj) {
  obj.data.id = obj.key.id;
  return obj.data;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  var results = [];
  Object.keys(obj).forEach(function (k) {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}

// Lists all books in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, books, nextPageToken)``.
// [START list]
function list (limit, token, cb) {
  var q = ds.createQuery([kind])
    .limit(limit)
    .order('createdAt')
    .start(token);

  ds.runQuery(q, function (err, entities, nextQuery) {
    if (err) {
      return cb(err);
    }
    var hasMore = entities.length === limit ? nextQuery.startVal : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}
// [END list]
function listBy (userId, limit, token, cb) {
  console.log("LISTBY");
  var q = ds.createQuery([kind])
    .filter('ownerId', userId)
    .start(token);

  ds.runQuery(q, function (err, entities, nextQuery) {
    inspectPrint(entities);
    if (err) {
      return cb(err);
    }
    var hasMore = entities.length === limit ? nextQuery.startVal : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}
// Creates a new book or updates an existing book with new data. The provided
// data is automatically translated into Datastore format. The book will be
// queued for background processing.
// [START update]
function update (id, data, cb) {
  var key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }
  if (!data.code){
    data.code = shortid.generate();
  }
  var query = ds.createQuery([kind])
    .filter('code', data.code );
  ds.runQuery(query, function (err, entities, nextQuery){
    if (err) {
      return cb(err);
    }
    //console.log(util.inspect(entities, {showHidden: false, depth: null}));
    if (entities.length > 0 ) {
      cb( {msg:"`"+data.code+"` has been used!" } );
    } else {
      data.createAt =Date.now();
      var entity = {
        key: key,
        data: toDatastore(data)
      };
      console.log(util.inspect(entity, {showHidden: false, depth: null}));
      ds.save(
        entity,
        function (err) {
          data.id = entity.key.id;
          cb(err, err ? null : data);
        }
      );
    }
  });
}
// [END update]

function read (id, cb) {
  var key = ds.key([kind, parseInt(id, 10)]);
  ds.runQuery(key, function (err, entity) {
    if (err) {
      return cb(err);
    }
    if (!entity) {
      return cb({
        code: 404,
        message: 'Not found'
      });
    }
    cb(null, fromDatastore(entity));
  });
}
function readCode (code, cb) {
  var query = ds.createQuery([kind])
    .filter('code', code);
  ds.runQuery(query, function (err, entities) {
    if (err) {
      return cb(err);
    }
    // inspectPrint(entities);
    cb(null, entities.map(fromDatastore));
  });
}
function readCount (userId, cb) {
  var query = ds.createQuery([kind_visit])
    .filter('urlOwner', userId);
    console.log(query);
  // inspectPrint(query);

  ds.runQuery(query, function (err, entities) {
    if (err) {
      return cb(err);
    }
    console.log("READ COUNTS");
    var result = [];
    for ( var i = 0; i < entities.length; i++ ){
      ( result[entities[i].data.urlCode] = result[entities[i].data.urlCode] || []).push(entities[i]);
    }
    inspectPrint(result);
    cb(null, result);
  });
}
function addVisit(req, url, cb){
  var key = ds.key(kind_visit);
  // inspectPrint(req.useragent);
  // inspectPrint(url);
  var data = {
    urlOwner: url.ownerId,
    urlKey: url.id,
    urlCode: url.code,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    isAndroid: req.useragent.isAndroid,
    isiPhone: req.useragent.isiPhone,
    isMobile: req.useragent.isMobile,
    browser: req.useragent.browser,
    os: req.useragent.os,
    platform: req.useragent.platform,
    userAgent: JSON.stringify(req.useragent),
    visitedAt: Date.now()
  }
  var entity = {
    key: key,
    data: toDatastore(data)
  };
  inspectPrint(entity);
  ds.save(
    entity,
    function (err) {
      data.id = entity.key.id;
      cb(err, err ? null : data);
    }
  );
}
function _delete (id, cb) {
  var key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

// [START exports]
module.exports = {
  create: function (data, cb) {
    update(null, data, cb);
  },
  read: read,
  readCode: readCode,
  update: update,
  delete: _delete,
  list: list,
  listBy: listBy,
  addVisit: addVisit,
  readCount: readCount
};
// [END exports]
