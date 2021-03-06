/* -----------------------------------------------------------------------------------------------
 * HELPER: Various functions used throughout the system
 * -----------------------------------------------------------------------------------------------
 */

"use strict";

var _ = require('underscore');
var vm = require('vm');
var querystring = require('querystring');
var fs = require('fs');

var CONFIGS = require("../config.js");
var Item = require("../models/item.js");
var log = require('../logger.js');
var configHelper = require("./config_helper.js");
var notifiers = registerNotifiers();

module.exports = {
  
  getNotifiers: function() {
    return notifiers;
  },
  
  // -----------------------------------------------------------------------------------------------
  // Meant to prevent invalid data types or undefined values from getting assigned to attributes
  // -----------------------------------------------------------------------------------------------
  safeAssign: function(valType, val, defaultVal) {

    // The val is undefined so return the default
    if (typeof val === 'undefined' || val === null) {
      return defaultVal;
    }

    // The caller is expecting a String so convert the val to String
    if (valType.toLowerCase().trim() === 'string') {
      var ret;
      if (typeof val === 'string') {
        if (val.trim() === '') {
          ret = defaultVal;
        } else {
          ret = val;
        }
      } else {
        ret = val.toString();
      }
      return ret;
    }

    // The val is already of the specified type so just return it
    if (typeof val === valType.toLowerCase().trim()) {
      return val;
    }

    // Otherwise convert the val to the specified type
    try {
      // this is a safe substitute for eval
      return vm.runInThisContext(val);
    } catch (e) {
      // Unable to convert the val to the specified type so return the default
      return defaultVal;
    }

  },
  // -----------------------------------------------------------------------------------------------
  // Really simple depluralization routine
  // -----------------------------------------------------------------------------------------------
  depluralize: function(value) {
    var ret = value.toString();

    if (value[value.length - 1] === 's') {
      ret = (value.substring(value.length - 3) === 'ies') ? ret.substring(0, ret.length - 3) + 'y' : ret.substring(0, ret.length - 1);

    } else {
      if (value[value.length - 1] === 'i') {
        // Ends in 'i' likely so default to 'us' octopi -> octopus, magi -> magus, loci -> locus (GOOD ENOUGH!)
        ret = ret.substring(0, ret.length - 1) + "us";
      }
    }

    return ret;
  },
  // -----------------------------------------------------------------------------------------------
  // Converts a query string into a HashMap  
  // -----------------------------------------------------------------------------------------------
  queryStringToMap: function(queryString) {
    return querystring.parse(queryString);
  },
  // -----------------------------------------------------------------------------------------------  
  // Converts a HashMap into a Query String
  // -----------------------------------------------------------------------------------------------
  mapToQueryString: function(map) {
    return querystring.stringify(map);
  },
  // -----------------------------------------------------------------------------------------------  
  // Converts an Item.js object and its children into a HashMap
  // -----------------------------------------------------------------------------------------------
  itemToMap: function(item) {
    var ret = {},
            self = this;

    if (item instanceof Item) {

      _.forEach(item.getAttributes(), function(value, key) {

        if (value instanceof Array) {
          if (_.size(value) > 0) {
            var children = [];

            _.forEach(value, function(child) {
              if (child instanceof Item) {
                children.push(self.itemToMap(child));

              } else {
                children.push(child);
              }
            });

            ret[key] = children;
          }

        } else {
          ret[key] = value;
        }

      });
    }

    return ret;
  },
  // -----------------------------------------------------------------------------------------------  
  // Converts a HashMap into Item.js Objects
  // -----------------------------------------------------------------------------------------------
  mapToItem: function(type, assignDefaults, map) {
    var attributes = {},
            usedKeys = [],
            self = this;

    if (typeof CONFIGS.data.objects[type] !== 'undefined') {

      // If the map was passed in attempt to populate the attributes and children
      if (_.size(map) > 0) {

        // Process the main item type
        _.forEach(map, function(value, key) {
          if (value instanceof Array) {

            // See if its a child of the current item
            if (typeof CONFIGS.data.objects[type].children !== 'undefined') {

              if (_.contains(CONFIGS.data.objects[type].children, key.slice(0, -1))) {
                // Initialize the attribute as an array if its not already defined
                if (typeof attributes[key] === 'undefined') {
                  attributes[key] = [];
                }

                _.forEach(value, function(child) {
                  // Recursively convert the child to an Item if its a hash map
                  if (typeof child !== 'string' && _.size(child) > 0) {
                    var item = self.mapToItem(key.slice(0, -1), assignDefaults, child);

                    if (_.size(item.getAttributes()) > 0) {
                      attributes[key].push(item);

                      // Loop through the attributes that got assigned to the child and add them to the list of used keys
                      _.forEach(item.getAttributes(), function(v, k) {
                        usedKeys.push(k);
                      });
                    }

                  } else {
                    // Otherwise its just an array of strings and not complex objects
                    attributes[key].push(_.flatten(child));
                    usedKeys.push(key);
                  }
                });

              } else {
                // Otherwise this is not a child item so flatten the array and assign it to the attribute
                attributes[key] = _.flatten(value);
                usedKeys.push(key);
              }

            } else {
              // Otherwise this is not a child item so flatten the array and assign it to the attribute
              attributes[key] = _.flatten(value);
              usedKeys.push(key);
            }

          } else {
            // If the key is defined as belonging to the item type then set it
            if (_.contains(CONFIGS.data.objects[type].attributes, key)) {
              attributes[key] = value;
              usedKeys.push(key);
            }
          }
        });

        return new Item(type, assignDefaults, attributes);

      } else {
        // The map was empty so generate an empty item
        return new Item(type, assignDefaults, {});
      }

    } else {
      throw new Error(configHelper.buildMessage(CONFIGS.message.undefined_item_type, [type]));
    }
  },
  // -----------------------------------------------------------------------------------------------  
  // Converts a flattened HashMap (meaning no parent-child hierarchy) like that received in an openURL
  // into Item.js objects
  // -----------------------------------------------------------------------------------------------
  flattenedMapToItem: function(type, assignDefaults, map) {
    var attributes = {},
            usedKeys = [],
            self = this;

    if (typeof CONFIGS.data.objects[type] !== 'undefined') {

      // If the map was passed in attempt to populate the attributes and children
      if (_.size(map) > 0) {
        // Loop through child objects and assign their values if applicable
        // This appropriately builds the object hierarchy when the incoming map is flat (e.g. from a querystring)
        _.forEach(CONFIGS.data.objects[type].children, function(child) {
          if (typeof attributes[child + 's'] === 'undefined') {
            attributes[child + 's'] = [];
          }

          var item = self.flattenedMapToItem(child, assignDefaults, map);

          if (item.hasAttributes()) {
            attributes[child + 's'].push(item);

            // Loop through the attributes that got assigned to the child and add them to the list of used keys
            _.forEach(item.getAttributes(), function(item, idx, attr) {
              _.forEach(attr, function(v, k) {
                usedKeys.push(k);
              });
            });
          }
        });

        // Proces the rest of the items in the map now that the children have been processed
        _.forEach(map, function(value, key) {
          // If the key is defined as belonging to the item type then set it
          if (_.contains(CONFIGS.data.objects[type].attributes, key)) {
            if (value instanceof Array) {
              attributes[key] = value;
            } else {
              if (value.trim() !== '') {
                attributes[key] = value;
              }
            }
            usedKeys.push(key);
          }
        });

        return new Item(type, assignDefaults, attributes);

      } else {
        // The map was empty so generate an empty item
        return new Item(type, assignDefaults, {});
      }

    } else {
      throw new Error(configHelper.buildMessage(CONFIGS.message.undefined_item_type, [type]));
    }

  },

  // -----------------------------------------------------------------------------------------------
  contactAllNotifiers: function(message, callback) {
    _.forEach(notifiers, function(notifier) {
      notifier.sendMessage(message, callback);
    });
  },
  // -----------------------------------------------------------------------------------------------
  contactNotifier: function(notifier, message, callback) {
    if (notifiers[notifier]) {
      notifiers[notifier].sendMessage(message, callback);

    } else {
      log.warn('Attempt to contact notifier, ' + notifier + ', but its not registered!');
    }
  }
};

function registerNotifiers() {
  var notifiers = {};

  _.each(CONFIGS.application.notifiers, function(name) {
    fs.exists(process.cwd() + '/lib/notifiers/' + name + '.js', function(exists) {
      if (exists) {

        fs.exists(process.cwd() + '/config/notifiers/' + name + '.yaml', function(exists) {
          if (exists) {
            var yml = require('js-yaml');

            var config = yml.load(fs.readFileSync(process.cwd() + '/config/notifiers/' + name + '.yaml', 'utf8'));
            var Notifier = require('../notifiers/' + name + '.js');

            notifiers[name] = new Notifier(config);

          } else {
            log.warn('The notifier, ' + name + ', was registered in application.yaml, but its YAML file does not exist in ./config/notifiers!');
          }

        });

      } else {
        log.warn('The notifier, ' + name + ', was registered in application.yaml, but the JS file does not exist in ./notifiers!');
      }
    });
  });

  return notifiers;
}