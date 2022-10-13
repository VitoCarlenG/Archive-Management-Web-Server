var mysql = require('mysql')

// async function dbConnector () {

    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "flmgmtsvc"
    });

    //Create Table archives
    con.query(
        "CREATE TABLE if not exists archives (\
            archive_id INT AUTO_INCREMENT PRIMARY KEY, \
            archive_type VARCHAR(16) UNIQUE NOT NULL, \
            archive_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \
            archive_updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP \
        )",
        function (err, result) {
            if (err) throw err;
    });
    
    //Create Table files
    con.query(
        "CREATE TABLE if not exists files (\
            file_id INT AUTO_INCREMENT PRIMARY KEY, \
            archive_type INT NOT NULL, \
            FOREIGN KEY(archive_type) REFERENCES archives(archive_id), \
            file_name VARCHAR(32) UNIQUE NOT NULL, \
            file_description VARCHAR(64), \
            file_path VARCHAR(128) UNIQUE NOT NULL, \
            file_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \
            file_updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP \
        )",
        function (err, result) {
            if (err) throw err;
    });

    console.log("dbConnector Is Okay")

// }

// dbConnector()

// module.exports = {
//     dbConnector
// }