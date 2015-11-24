// proceed as hadoopuser
process.setuid(501);

var readline = require( 'readline' );
var execFile = require( 'child_process' ).execFile;
var spawn = require( 'child_process' ).spawn;
var connection = require( './models/base.js' );

var job_id = process.argv[2];
var user_id = process.argv[3];
var textfile = process.argv[4];
var mapper = process.argv[5];
var reducer = process.argv[6];
var status = 0;//running
var date = new Date().getTime();
var hdfs_dir = user_id + "_" + date;

connection.query( 'UPDATE job SET status = ? WHERE id = ?', [ status, job_id ] );

process.env[ 'PATH' ] = process.env['PATH'] + ':/home/hadoopuser/hadoop/bin:/home/hadoopuser/hadoop/sbin';
process.env[ 'HADOOP_HOME' ] = '/home/hadoopuser/hadoop';
process.env[ 'JAVA_HOME' ] = '/usr/lib/jvm/java-1.7.0-openjdk.x86_64/';

execFile('hdfs', [ 'dfs', '-mkdir', hdfs_dir ], function( error, stdout, stderr ) {
        console.log(stdout);
	execFile( 'hdfs', [ 'dfs', '-copyFromLocal', 'input/' +  textfile, hdfs_dir  + '/' + textfile ], function( error, stdout, stderr ) {
		var job = spawn( './hadoopJobInit.sh', [ mapper, reducer, hdfs_dir ] );
		readline.createInterface({
  			input     : job.stderr,
 			terminal  : false
		}).on( 'line', function(line) {
			if( status == 0 && line.indexOf("running in uber mode") > -1 ) {
				status = 1;
				connection.query( 'UPDATE job SET status = ? WHERE id = ?', [ status, job_id ] );	
			}
  			console.log(line);
		});

		job.on( 'exit', function (code) {
  			console.log('child process exited with code ' + code);
			if( code != 0 ) {
				status = 3;
			} else {
				status = 2;
			}
		});

		job.on( 'close', function (code) {
  			console.log( 'child process exited with code ' + code );
		
			// hadoop job fail	
			if( code != 0 ) {
				status = 3;
				connection.query( 'UPDATE job SET status = ? WHERE id = ?', [ status, job_id ] );
				process.exit(1);
			} else {
				status = 2;
				execFile( 'mkdir', [ 'output/' + hdfs_dir ], function( error, stdout, stderr ) {
        	                        execFile( 'hdfs', [ 'dfs', '-copyToLocal', hdfs_dir + '_outdir/part-00000', 'output/' + hdfs_dir + '/part-00000' ], function( error, stdout, stderr ) {
						execFile( 'hdfs', [ 'dfs', '-rm', '-r', hdfs_dir + '_outdir' ], function( error, stdout, stderr) {
							execFile( 'hdfs', [ 'dfs', '-rm', '-r', hdfs_dir ], function( error, stdout, stderr ) {
								console.log(hdfs_dir)
	                                        		connection.query('UPDATE job SET output_dir = ?, status = ? WHERE id = ?', [ hdfs_dir, status, job_id ]);
							});
						});
                	                });
                       		});
			}

		});
	});
});

