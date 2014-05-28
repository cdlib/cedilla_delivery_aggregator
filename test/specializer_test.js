require("../init.js");

describe('Specializer', function(){
  describe('#specialize()', function(){
    
    it('should correctly identify the openurl version', function(){
/*      var query = "url_ver=Z39.88-2004&url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";
      var qs = helper.queryStringToMap(query);
      var translator = new Translator('openurl');
      var map = translator.translateMap(qs, false);
      map['original_citation'] = query;
      var item = helper.flattenedMapToItem('citation', true, map);
      var spcl = specializers.newSpecializer('openurl', item);
      spcl.specialize();
      var additional = item.getAttributes().additional;
      var version = _.find(additional, function(i) { return i.ourl_version; });
      assert.equal(version.ourl_version, '1.0');  
    });

   it('should identify the openurl version without url_ver field', function(){
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";
      var qs = helper.queryStringToMap(query);
      var translator = new Translator('openurl');
      var map = translator.translateMap(qs, false);
      map['original_citation'] = query;
      var item = helper.flattenedMapToItem('citation', true, map);
      var spcl = specializers.newSpecializer('openurl', item);
      spcl.specialize();
      var additional = item.getAttributes().additional;
      var version = _.find(additional, function(i) { return i.ourl_version; });
      assert.equal(version.ourl_version, '1.0');
   });

   it('should identify openurl 0.1', function(){
      var query = "sid=UCLinks-google&volume=8&aulast=Ellison&month=09&atitle=Mangrove Restoration: Do We Know Enough?&spage=219&issn=1061-2971&issue=3&genre=article&auinit=A M&aufirst=Aaron&epage=229&title=Restoration ecology&year=2000&date=2000-09&pid=institute=UCB&placeOfPublication=Cambridge%2c+Mass.&publisher=Blackwell+Scientific+Publications";
      var qs = helper.queryStringToMap(query);
      var translator = new Translator('openurl');
      var map = translator.translateMap(qs, false);
      map['original_citation'] = query;
      var item = helper.flattenedMapToItem('citation', true, map);
      var spcl = specializers.newSpecializer('openurl', item);
      spcl.specialize();
      var additional = item.getAttributes().additional;
      var version = _.find(additional, function(i) { return i.ourl_version; });
      assert.equal(version.ourl_version, '0.1');   */
   });


  })

})
