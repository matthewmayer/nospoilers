"use strict";


const TVDB = require('node-tvdb');
const _ = require("underscore")
const WikidataSearch = require('wikidata-search').WikidataSearch;
const got = require("got")
const moment = require("moment")

exports.home = (req, res) => {
    res.render('index', { title: 'No spoilers' });
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
      var episodes = _.sortBy(show.episodes,"absoluteNumber")
      
      
      
      //First, create a new Wikidata Search object.
        
        var wikidataSearch = new WikidataSearch();

        //To search:
        wikidataSearch.set('search', show.seriesName); //set the search term
        wikidataSearch.search(function(result, error) {
            if (error) {
              return;
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
                    
                    
                    res.render('show', { title: 'Show', show:show, episodes:episodes, wikilink:wikilink });
                  });
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
  var date = moment.utc(req.query.date).subtract(1, "day").toISOString();
  var enAPI = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles="+encodeURIComponent(wikilink)+"&rvprop=timestamp|ids&rvstart="+date+"&rvlimit=1"
  got(enAPI, {
    json: true
  }).then(data => {
    var revid = (_.values(data.body.query.pages)[0]["revisions"][0]["revid"])
    var url = "https://en.wikipedia.org/w/index.php?title="+encodeURIComponent(wikilink)+"&oldid="+revid
    res.redirect(url)
  });
}