var express = require('express');
var crypto = require('crypto');
var connection = require('../models/base');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  	res.render('hadoop/login', {title: 'hadoop Platform'});
  	//res.send('respond with a resource');
});

router.post('/', function(req, res, next) {
	var name = req.param("name");
	var password = crypto.createHash('sha1').update(req.param("password")).digest('hex');

	connection.query("SELECT * FROM user WHERE name = ? AND password = ?", [name, password], function(err, rows, fields) {
  		if (rows.length > 0) {
    			req.session.user_id = rows[0].id;
    			res.status(200).send();
  		} else {
   			res.status(404).send();
		}
	});
});

router.get('/logout', function (req, res) {
  delete req.session.user_id;
  res.redirect('./');
});  

module.exports = router;
