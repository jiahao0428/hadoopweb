var express = require('express');
var connection = require('../models/base');
var child = require('child_process');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var router = express.Router();


function checkAuth(req, res, next) {

  if (!req.session.user_id) {
	res.status(200).send('You are not authorized to view this page');
  } else {
	next();
  }

};


function job_status(value) {

	var status = [ 'pending', 'running', 'completed', 'failed' ];

	return status[ value ];

};


router.use(function(req, res, next) {

	if(req.url.indexOf('users') == -1) {
		checkAuth( req, res, next );
	} else {
		next();
	}

});


/* GET home page. */
router.get('/', function(req, res, next) {

  	res.render('index', { title: 'Express' });

});


router.get('/hadoop', function(req, res, next) {

	connection.query('SELECT name FROM user WHERE id = ?', [ req.session.user_id ], function( err, row, field ) {
  		res.render('hadoop/index', { username: row[0].name });
	});

});


router.post('/upload', function(req, res, next) {

  	var form = new formidable.IncomingForm();
        var date = new Date().getTime();
  	form.uploadDir = "input/";
	var newFileName = '';  	
	
	form.on('file', function(field, file) {
            	//rename the incoming file to the file's name
		if( file.type == 'text/plain' ) {
        		newFileName = req.session.user_id + "_" + date + '_' + file.name;
			fs.rename( file.path, form.uploadDir + "" +newFileName );
			res.status(200).send(JSON.stringify( { filename: newFileName } ));
		} else {
			res.status(404).send();
		}
	});

	form.parse(req);

});


router.get('/job', function(req, res, next) {
	
	var json = '';
	var query = 'SELECT * FROM job WHERE user_id =' + req.session.user_id;		
	connection.query(query, function(err, rows, fields) {
  		if (err) throw err;
	
		rows.forEach(function(row) {
			row.status = job_status(row.status);
		});
		json = JSON.stringify(rows);
		res.status(200).send(json);
	});

});


router.get('/job/:id', function(req, res, next) {

	connection.query('SELECT * FROM job WHERE id = ? AND user_id = ?', [ req.params.id, req.session.user_id ], function( err, row, fields ) {

		row[0].status = job_status( row[0].status );
		var json = JSON.stringify(row);

		res.status(200).send(json);
	});
	
});


router.post('/job', function(req, res, next) {

  	var job_name = req.param('job_name');
	var mapperCode = req.param('mapperCode');
  	var reducerCode = req.param('reducerCode');
	var filename = req.param('filename');
	var date = new Date().getTime();
	var mapperfile = req.session.user_id + "_" + date + '_mapper.py';
	var reducerfile = req.session.user_id + "_" + date + '_reducer.py';
	var post = { user_id: req.session.user_id, job_name: job_name, file: filename, mapper: mapperfile, reducer: reducerfile, status: 0 }; 
 
  	fs.writeFile( __dirname + "/../mapper/" + mapperfile, mapperCode, function(err) {
    		if(err) {
        		return console.log(err);
    		}	
		fs.writeFile( __dirname + "/../reducer/" + reducerfile, reducerCode, function(err) {
			if(err) {
				return console.log(err);
			}

			connection.query('INSERT INTO job SET ?', post, function(err, result) {
				var job_id = result.insertId;
				var c = child.fork( './hadoopJob.js', [ job_id, req.session.user_id, filename, mapperfile, reducerfile ],{detached: true});
				var pid = c.pid;

				console.log(pid)
				connection.query( 'UPDATE job SET pid = ? WHERE id = ?', [ pid, job_id ]);

  				res.status(200).send(JSON.stringify( { job_id: job_id } ));
			});
		});
  	});


});


router.delete('/job/:id', function(req, res, next) {

	connection.query( 'SELECT * FROM job WHERE id = ? AND user_id = ?', [ req.params.id, req.session.user_id ], function( err, row, field ) {
		fs.unlink( __dirname + '/../mapper/' + row[0].mapper, function( err ) {
			fs.unlink( __dirname + '/../reducer/' + row[0].reducer, function( err ) {
				fs.unlink( __dirname + '/../input/' + row[0].file, function( err ) {
					
					if( row[0].pid && ( row[0].status == 0 || row[0].status == 1 ) ) {
						process.kill( -row[0].pid );
					}

					if( row[0].output_dir ) {
						fs.unlink( __dirname + '/../output/' + row[0].output_dir +'/part-00000', function( err ) {
							fs.rmdir( __dirname + '/../output/' + row[0].output_dir, function( err ) {
							});
						});
					}
					connection.query( 'DELETE FROM job WHERE id = ? AND user_id = ?', [ req.params.id, req.session.user_id ], function( err, result ) {
						res.status(200).send();
					});
				});
			});
		});	
	});	

});


router.get( '/download/:file', function( req, res, next ) {
	connection.query( 'SELECT * FROM job WHERE user_id = ? AND output_dir = ?', [ req.session.user_id, req.params.file ], function( err, row, field ) {
		if( row.length > 0 ) {
			var file = __dirname + '/../output/' + req.params.file + '/part-00000';
			var filename = path.basename(file);
			var filestream = fs.createReadStream(file);
		
			res.setHeader( 'Content-disposition', 'attachment; filename=' + filename );
			res.setHeader( 'Content-type', 'text/plain' );
			filestream.pipe(res);
		}
		else {
			res.status(404).send();
		}	
	});
});

module.exports = router;
