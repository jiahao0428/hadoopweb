var mysql = require('mysql');

var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1a@SqzWX',
        database: 'hadoop'
});

connection.connect();

module.exports = connection;
