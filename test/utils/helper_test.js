"use strict";

var _ = require('underscore');
var assert = require('assert');

var CONFIGS = require("../../lib/config.js");
var helper = require("../../lib/utils/helper.js");
var configHelper = require("../../lib/utils/config_helper.js");
var Item = require("../../lib/models/item.js");
var Translator = require("../../lib/utils/translator.js");

describe("helper.js", function() {
  this.timeout(20000);

  var getAttributeMap;

  // ---------------------------------------------------------------------------------------------------
  before(function(done) {
    // Wait for the config file and initial moduleshave finished loading before starting up the server
    var delayStartup = setInterval(function() {
      if (typeof Item !== 'undefined') {
        clearInterval(delayStartup);

        getAttributeMap = function(type) {
          var map = {};

          if (typeof CONFIGS.data.objects[type] !== 'undefined') {

            _.forEach(CONFIGS.data.objects[type].attributes, function(attribute) {
              map[attribute] = 'foo-bar';
            });

            if (typeof CONFIGS.data.objects[type].children !== 'undefined') {
              _.forEach(CONFIGS.data.objects[type].children, function(child) {
                map[child + 's'] = [getAttributeMap(child)];
              });
            }
          }

          return map;
        };

        done();
      }
    });
  });


  // ---------------------------------------------------------------------------------------------------
  it('testing safeAssign()', function() {

    console.log('HELPER: checking safeAssign');

    // Make sure the default is assigned if the value is missing
    assert.equal('default', helper.safeAssign('string', undefined, 'default'));
    assert.equal('default', helper.safeAssign('string', null, 'default'));
    assert.equal('default', helper.safeAssign('string', '  ', 'default'));

    // Make sure the default is assigned if the data type and value mismatch
    assert.equal(false, helper.safeAssign('boolean', 'tester', false));
    assert.equal(0, helper.safeAssign('integer', 'foo', 0));
    assert.equal(0, helper.safeAssign('double', 'bar', 0));

    // valid assignments
    assert.equal('foo', helper.safeAssign('string', 'foo', 'default'));
    assert(helper.safeAssign('boolean', 'true', false));
    assert(helper.safeAssign('boolean', true, false));
    assert.equal(13, helper.safeAssign('integer', '13', 0));
    assert.equal(13, helper.safeAssign('integer', 13, 0));
    assert.equal(13.5, helper.safeAssign('double', '13.5', 0));
    assert.equal(13.5, helper.safeAssign('double', 13.5, 0));
    assert.equal('13.5', helper.safeAssign('string', 13.5, '0'));
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing buildMessage()', function() {

    console.log('HELPER: checking buildMessage');

    _.forEach(CONFIGS.message, function(value) {
      var tmp = value,
              vals = [];

      while (tmp.indexOf('?') >= 0) {
        tmp = tmp.replace('?', "'foo_" + _.size(vals) + "'");
        vals.push("foo_" + _.size(vals));
      }

      assert.equal(tmp, configHelper.buildMessage(value, vals));
    });
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing depluralize()', function() {

    console.log('HELPER: checking depluralize');

    assert.equal('citation', helper.depluralize('citations'));
    assert.equal('camel', helper.depluralize('camels'));
    assert.equal('city', helper.depluralize('cities'));
    assert.equal('base', helper.depluralize('bases'));
    assert.equal('locus', helper.depluralize('loci'));

    assert.notEqual('targets', helper.depluralize('targets'));

    // Depluralize is super basic, it does not currently handle these items
    assert.notEqual('mouse', helper.depluralize('mice'));
    assert.notEqual('goose', helper.depluralize('geese'));
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing queryStringToMap()', function() {
    console.log('HELPER: checking query string to Map');

    var map = {'foo': 'bar', 'one': 'fish', 'two': 'fish', 'red': 'fish', 'blue': 'fish'};

    var out = helper.queryStringToMap('foo=bar&one=fish&two=fish&red=fish&blue=fish');

    _.forEach(map, function(val, key) {
      assert.equal(val, out[key]);
    });

  });

  // ---------------------------------------------------------------------------------------------------
  it('testing mapToQueryString()', function() {
    console.log('HELPER: checking map to query string');

    var qs = 'foo=bar&one=fish&two=fish&red=fish&blue=fish';

    var out = helper.mapToQueryString({'foo': 'bar', 'one': 'fish', 'two': 'fish', 'red': 'fish', 'blue': 'fish'});

    assert.equal(qs, out);
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing itemToMap()', function() {

    console.log('HELPER: checking item to map conversion');

    _.forEach(CONFIGS.data.objects, function(def, type) {
      var map = getAttributeMap(type);

      var item = new Item(type, false, map);

      var out = helper.itemToMap(item);

      _.forEach(map, function(val, key) {
        if (val instanceof Array) {
          _.forEach(val, function(v, k) {
            assert.equal(v, out[key][k]);
          });

        } else {
          assert.equal(val, out[key]);
        }
      });
    });
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing mapToItem()', function() {

    console.log('HELPER: checking map to item conversion');

    assert.throws(function() {
      helper.mapToItem('foo', false, {});
    });

    _.forEach(CONFIGS.data.objects, function(def, type) {

      var map = getAttributeMap(type);

      var item = new Item(type, false, map);

      var out = helper.mapToItem(type, false, map);

      _.forEach(item.getAttributes(), function(val, key) {
        if (val instanceof Array) {
          assert.equal(1, _.size(val));

        } else {
          assert.equal(val, out.getAttribute(key));
        }
      });

    });
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing flattenedMapToItem()', function() {
    var translator = new Translator(''),
            translator2 = new Translator('openurl');

    var hash = {},
            hash2 = {},
            obj,
            obj2;

    console.log('HELPER: checking flattened map (e.g. openurl) to item conversion');

    // Loop through the object definitions and translate their attribute names 
    _.forEach(CONFIGS.data.objects, function(def, type) {
      var map = translator.translateMap(getAttributeMap(type), true);

      _.forEach(map, function(v, k) {
        hash[k] = v;
      });

      var map2 = translator2.translateMap(getAttributeMap(type), true);
      _.forEach(map2, function(v, k) {
        hash2[k] = v;
      });

      // Build the objects for both the defined and undefined translators for comparisson
      if (typeof def.root !== 'undefined') {
        obj = helper.mapToItem(type, false, map);
        obj2 = helper.mapToItem(type, false, map2);
      }

    });

    var rslt = helper.flattenedMapToItem(obj.getType(), false, hash);
    var rslt2 = helper.flattenedMapToItem(obj2.getType(), false, hash2);

    _.forEach(rslt.getAttributes(), function(val, key) {
      if (val instanceof Array) {
        if (_.first(val) instanceof Item) {
          _.forEach(_.first(val).getAttributes(), function(v, k) {
            assert.equal(v.toString(), _.first(obj.getAttribute(key)).getAttribute(k).toString());
          });
        }

      } else {
        assert.equal(val.toString(), obj.getAttribute(key).toString());
      }
    });

    _.forEach(rslt2.getAttributes(), function(val, key) {
      if (val instanceof Array) {
        if (_.first(val) instanceof Item) {
          _.forEach(_.first(val).getAttributes(), function(v, k) {
            assert.equal(v.toString(), _.first(obj2.getAttribute(key)).getAttribute(k).toString());
          });
        }

      } else {
        assert.equal(val.toString(), obj2.getAttribute(key).toString());
      }
    });

  });

  // ---------------------------------------------------------------------------------------------------
  it('testing getRootItemType()', function() {
    var root = '';

    console.log('HELPER: checking root item');

    _.forEach(CONFIGS.data.objects, function(def, type) {
      if (typeof def.root !== 'undefined') {
        root = type;
      }
    });

    assert.equal(root, configHelper.getRootItemType());
  });

  // ---------------------------------------------------------------------------------------------------
  it('testing getCrossReference()', function() {

    console.log('HELPER: checking X-Ref lookups');

    assert(typeof CONFIGS.xref !== 'undefined');

    _.forEach(CONFIGS.xref, function(attributes, type) {
      _.forEach(attributes, function(xrefs, attr) {

        // Only do a sampling because language has too many entries
        var keys = _.sample(_.keys(xrefs), 11);

        _.forEach(keys, function(correctVal) {
          _.forEach(xrefs[correctVal], function(val) {
            assert.equal(configHelper.getCrossReference(type, attr, val), correctVal);
          });
        });

        // Assert that no matching value returns the value passed in
        assert.equal(configHelper.getCrossReference(type, attr, 'foo'), 'foo');
      });

      // Assert an unknown attribute returns the value passed in
      assert.equal(configHelper.getCrossReference(type, 'bar', 'foo'), 'foo');
    });

    // Assert that an unknown item type or attribute return the value passed in
    assert.equal(configHelper.getCrossReference('foo', 'bar', 'blah'), 'blah');
  });
});
