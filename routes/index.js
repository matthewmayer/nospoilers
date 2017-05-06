var express = require('express');
var router = express.Router();
var search = require("../app/controllers/search")

/* GET home page. */
router.get('/', search.home);

router.get('/search', search.search);

router.get('/show/:id', search.show);

router.get('/timetravel', search.timetravel);

module.exports = router;
