"use strict";


const TVDB = require('node-tvdb');
const _ = require("underscore")
const WikidataSearch = require('wikidata-search').WikidataSearch;
const got = require("got")
const moment = require("moment")
const async = require("async")

exports.home = (req, res) => {
    const tvdb = new TVDB(process.env.TVDB_API_KEY);
    var series = [121361, 176941,81189,80337,153021]
    async.map(series, (id, callback) => {
      tvdb.getSeriesById(id)
        .then(show => { 
          callback(null, show)
         })
        .catch(callback);  
    }, (err, shows) => {
      if (err) {
        return res.status(500).send(err)
      }
      res.render('index', { title: 'No spoilers', shows:shows });
    })
    
}
exports.search = (req, res) => {
  const tvdb = new TVDB(process.env.TVDB_API_KEY);
  tvdb.getSeriesByName(req.query.show)
    .then(shows => { 
      console.dir(shows)
      res.render('search', { title: 'Search', shows:shows });
     })
    .catch(error => { 
      res.status(500).send(error)
     });  
}
exports.show = (req, res) => {
  if (!req.params.id) {
    return res.status(404).send("Not found");
  }
  const tvdb = new TVDB(process.env.TVDB_API_KEY);
  tvdb.getSeriesAllById(parseInt(req.params.id))
  .then(show => {
      var episodes = _.map(_.sortBy(show.episodes,"absoluteNumber"), episode => {
        
        if (episode.firstAired) {
          episode.firstAiredAfter = moment.utc(episode.firstAired).add(1, "day").toISOString().substr(0,10)
          episode.firstAiredBefore = moment.utc(episode.firstAired).subtract(1, "day").toISOString().substr(0,10)
        }
        return episode
      })
      
      
      
      //First, create a new Wikidata Search object.
        
        var wikidataSearch = new WikidataSearch();

        //To search:
        wikidataSearch.set('search', show.seriesName); //set the search term
        wikidataSearch.search(function(result, error) {
            console.log("wikidataSearch "+error);
            if (error) {
              return res.render('show', { title: show.seriesName, show:show});;
            }
            var ids = _.pluck(result.results,"id")
            var w2 = new WikidataSearch()
            w2.getEntities(ids, false,["description","label","claims"], function(result, error) {
                var entities = result.entities
                entities = _.filter(entities, function(entity) {
                  return _.where(entity.claims, { "property": "P31", "value": "Q5398426"}).length>0 //its a TV show
                })
                var wikipedia = _.first(entities)
                if (wikipedia) {
                  const url = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids="+wikipedia.id+"&sitefilter=enwiki"
                  got(url, {
                  	json: true
                  }).then(data => {
                    var wikilink = (data.body.entities[wikipedia.id]["sitelinks"]["enwiki"]["title"])
                    
                    
                    res.render('show', { title: show.seriesName, show:show, episodes:episodes, wikilink:wikilink });
                  });
                } else {
                  res.render('show', { title: show.seriesName, show:show});
                }
                
                
            });
        });

  

  })
  .catch(error => { 
    res.status(500).send(error)
   });
  
    
     
}
exports.timetravel = (req, res) => {
  var wikilink = req.query.wikilink
  var date = moment.utc(req.query.date).toISOString();
  var enAPI = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles="+encodeURIComponent(wikilink)+"&rvprop=timestamp|ids&rvstart="+date+"&rvlimit=1"
  got(enAPI, {
    json: true
  }).then(data => {
    var vals = _.values(data.body.query.pages)
    if (vals.length==0) {
      return res.send("Not found - this probably predates Wikipedia!")
    }
    var revid = (vals[0]["revisions"][0]["revid"])
    var url = "https://en.wikipedia.org/w/index.php?title="+encodeURIComponent(wikilink)+"&oldid="+revid
    res.redirect(url)
  }).catch(error => {
    console.log(error);
    return res.send("Not found - this probably predates Wikipedia!")
  });
}