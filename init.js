// Load up all of our modules once

// These modules are used throughout (Broker, Tier, Service, etc.)
module.exports = fs = require('fs');
module.exports = yaml = require('js-yaml');
module.exports = _ = require('underscore');
module.exports = util = require('util');  
module.exports = events = require('events');

module.exports = CONFIGS = require("./lib/config.js");

// Used by Tier
module.exports = Encoder = require('node-html-encoder').Encoder;

// Used by Service
module.exports = url = require('url');
module.exports = uuid = require('node-uuid');

// Used in helper
module.exports = querystring = require('querystring');

var i = 0;

// Setup a timer to wait for the CONFIGS to get loaded before continuing
var waitForConfigs = setInterval(function(){
  if(typeof CONFIGS['application'] != 'undefined' || i == 2000){
    clearInterval(waitForConfigs);
 
    module.exports = helper = require("./lib/util/helper.js");
    module.exports = serializer = require("./lib/util/serializer.js");
    module.exports = specializers = require("./lib/util/specializer.js");
    module.exports = Translator = require("./lib/util/translator.js");
    module.exports = Consortial = require("./lib/util/consortial.js");
    
    module.exports = Request = require("./lib/model/request.js");
    module.exports = Transaction = require("./lib/model/transaction.js");
    module.exports = Item = require("./lib/model/item.js");

    module.exports = LOGGER = require('./lib/logger.js');
    module.exports = Broker = require("./lib/broker.js");
    module.exports = Tier = require("./lib/tier.js");
    module.exports = Service = require("./lib/service.js");

    // Should be for TEST only!
    module.exports = assert = require("assert");
  }
  i++;
}, 200);
