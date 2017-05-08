var express = require('express');
var router = express.Router();
var search = require("../app/controllers/search")
var mw = require("../app/controllers/middleware")

/* GET home page. */
router.get('/', mw.cache(60*60*24), search.home);

router.get('/search', mw.cache(60*60*24), search.search);

router.get('/show/:id', mw.cache(60*60*24), search.show);

router.get('/timetravel', search.timetravel);

module.exports = router;
