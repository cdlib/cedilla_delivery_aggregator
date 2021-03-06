/*
 * The server module starts up the http server and responds to events 
 * over the socket.io connection
 */

"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var _ = require('underscore');
var uuid = require('node-uuid');

var CONFIGS = require("./config.js");
var router = require('./router');
var log = require('./logger.js');
var helper = require("./utils/helper.js");
var OpenUrlParser = require("./parsers/openurl.js");
var Broker = require("./broker.js");
var Item = require("./models/item.js");
var Request = require("./models/request.js");
var serializer = require("./utils/serializer.js");
var Consortial = require("./utils/consortial.js");


try {
  var app = express();
  app.set('views', __dirname.replace('/lib', '/views'));
  app.set('view engine', 'ejs');
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(express.static(path.join(__dirname.replace('lib', ''), 'public')));

  // Routing
  app.use('/', router);

  var server = require('http').Server(app),
          io = require('socket.io')(server);

  // ----------------------------------------------------------------------------------------------
  io.on('connection', function(socket) {

    socket.on('openurl', function(data) {
      // Register a child logger with a unique request id to hellp us keep all activity for this request together.
      this.log = log.child({request_id: uuid.v4()});

      try {
        this.log.info({object: 'server.js', openurl: data}, 'New socket connection request established.');

        // Construct Request object based on the app config and the incoming HTTP Request info
        var request = buildRequestFromSocket(socket),
                self = this;

        // Record the original request
        request.setRequest(data.toString().replace('"', '&quot;').
                replace("\r", '').replace("\n", '').replace("\t", '').
                replace('{', '%7B').replace('}', '%7D'));

        var parser = new OpenUrlParser(request.getRequest());

        processCedillaInformation(request, function(rqst) {

          handleConsortialRecognition(rqst, (socket.handshake.address ? socket.handshake.address.address : ''), function(req) {

            parser.parse(req, function(r) {
              // Send the socket, and request object over to the Broker for processing
              var broker = new Broker(socket, r, self.log);

              // Process each requested item 
              _.forEach(r.getReferents(), function(item) {
                broker.processRequest(item, function(request) {
                  self.log.info({history: serializer.requestToJson(request)}, 'Finished processing request. See history for full details.');
                });
              });
            });

          });
        });

      } catch (e) {
        log.error({object: 'server.js'}, e);

        var err = new Item('error', false, {'level': 'error', 'message': CONFIGS.message.generic_http_error});
        socket.emit(serializer.itemToJsonForClient('cedilla', err));
      }
    });
  });

// Catch any unhandled exceptions!!!
} catch (e) {
  var msg = 'A fatal exception occurred! ' + e.message;
  try {
    log.error({object: 'server.js'}, e);
  } catch (e1) {
    console.log('error', msg);
    console.log(e1.stack);
  }
}

module.exports = exports = server;


// ----------------------------------------------------------------------------------------------
function buildRequestFromSocket(socket) {
  var request = new Request({'content_type': (socket.handshake.headers ? socket.handshake.headers['content-type'] : 'text/html'),
    'agent': (socket.handshake.headers ? socket.handshake.headers['user-agent'] : ''),
    'language': (socket.handshake.headers ? socket.handshake.headers['accept-language'] : 'en'),
    'service_api_version': CONFIGS.application.service_api_version,
    'client_api_version': CONFIGS.application.client_api_version});

  // Collect the Referrers
  if (socket.handshake.headers.host) {
    request.addReferrer(socket.handshake.headers.host);
  }
  if (socket.handshake.headers.referer) {
    request.addReferrer(socket.handshake.headers.referer);
  }

  return request;
}

// ----------------------------------------------------------------------------------------------
// Process any parameters that are specific to Cedilla
// ----------------------------------------------------------------------------------------------
function processCedillaInformation(request, callback) {
  var hash = helper.queryStringToMap(request.getRequest()),
          cleanedRequest = '';

  _.forEach(hash, function(value, key) {
    // If a consortial affiliation was passed in, assign it!
    if (key === CONFIGS.application.openurl_client_affiliation) {
      request.getRequestor().setAffiliation(value);
    } else {
      cleanedRequest += key + '=' + value + '&';
    }
  });

  if (cleanedRequest.length > 0) {
    cleanedRequest = cleanedRequest.slice(0, -1);
  }

  request.setUnmapped(cleanedRequest.replace('"', '\\"'));

  callback(request);
}

// ----------------------------------------------------------------------------------------------
// Call the Consortial Service if enabled to determine the user's campus affiliation
// ----------------------------------------------------------------------------------------------
function handleConsortialRecognition(request, ip, callback) {
  var done = false;

  // If the configuration is setup to retrieve consortial information
  if (CONFIGS.application.consortial_service) {
    // Get the affiliation for the client
    try {
      var consortial = new Consortial(log);

      if (!request.getRequestor().getAffiliation()) {
        if (!request.getRequestor().getIp()) {
          // No campus affiliation OR IP was specified, so trying to translate the incoming IP
          consortial.translateIp(ip, function(code) {
            consortial.translateCode(code, function(ip) {
              if (ip !== 'unknown') {
                request.getRequestor().setIp(ip);
              }
              done = true;
            });
            request.getRequestor().setAffiliation(code);
          });

        } else {
          // IP was specified so get the code
          consortial.translateIp(request.getRequestor().getIp(), function(code) {
            request.getRequestor().setAffiliation(code);
            done = true;
          });
        }

      } else {
        // A campus affilition was specified so get the generic VPN IP
        consortial.translateCode(request.getRequestor().getAffiliation(), function(ip) {
          request.getRequestor().setIp(ip);
          done = true;
        });
      }

    } catch (err) {
      this.log.error({object: 'server.js'}, err.message);

      request.addError(CONFIGS.message.broker_consortial_error);
    }
    var j = 0; // Safety check in case the consortial service is enabled in config but happens to be offline
    var waitUntilDone = setInterval(function() {
      if (done || j >= CONFIGS.application.consortial_service.timeout) {
        clearInterval(waitUntilDone);
        callback(request);
      }
      j++;
    }, 50);

  } else {
    callback(request);
  }
}
