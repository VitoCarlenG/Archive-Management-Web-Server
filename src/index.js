const express = require('express')
const app = express()
const port = 8083
var cors = require('cors')
var mysql = require('mysql')
var fs = require('fs')

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const regexArchive = /Archive/i
const regexSpecialCharacters = /[~`!@#$%^&()_={}[\]:;,.<>+\/?-]/
const regexMetaCharacters = /\s/
const regexNumerics = /^[A-Za-z]+$/

const build = async function () {

    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "flmgmtsvc"
    });

    app.use(cors(), express.json({ limit: '200mb' }), express.urlencoded({ limit: '200mb', extended: true }))

    app.get('/', (req, res) => {
        res.send({ message: `Hit File Management Services On Port ${port}` })
    })

    app.get('/get-archives', (req, res) => {

        con.query("SELECT * FROM archives ORDER BY archive_type", function (err, archives) {
            if (err) throw err;
            res.send({ archives })
        });
    })

    app.get('/get-files', (req, res) => {

        con.query("SELECT * FROM files", function (err, files) {
            if (err) throw err;
            res.send({ files })
        });
    })

    app.get('/get-file', (req, res) => {

        con.query("SELECT * FROM files where file_id=?",
            [
                req.query.file_id
            ],
            function (err, file) {
                if (err) throw err;
                res.send({ file })
            });
    })

    app.get('/view-year-folders', (req, res) => {

        var dir = `src/upload/${req.query.archive_type}`

        fs.readdir(dir, function (err, year_folders) {
            res.send({ year_folders })
        });
    })

    app.get('/view-month-folders', (req, res) => {

        var dir = `src/upload/${req.query.archive_type}/${req.query.archive_year}`

        fs.readdir(dir, function (err, month_folders) {
            res.send({ month_folders })
        });
    })

    app.get('/view-files', (req, res) => {

        con.query("SELECT f.file_id, f.archive_type, f.file_name, f.file_description, f.file_path, f.file_created_at, f.file_updated_at FROM files f join archives a on (f.archive_type = a.archive_id) where a.archive_type=? AND f.file_path like ? ORDER BY f.file_path DESC",
            [
                req.query.archive_type,
                `%${req.query.archive_type}/${req.query.archive_year}/${req.query.archive_month}%`
            ],
            function (err, files) {
                if (err) throw err;
                res.send({ files })
            });
    })

    app.post('/create-archive', (req, res) => {

        if (req.body.archive_type.length > 16) {
            res.send({ error: "Maximum Length For Folder Name's 16 Letters" })
        } else if (regexArchive.test(req.body.archive_type) || regexSpecialCharacters.test(req.body.archive_type) || regexMetaCharacters.test(req.body.archive_type) || !regexNumerics.test(req.body.archive_type)) {
            res.send({ error: "Forbidden Folder Name" })
        } else {
            var dir = `src/upload/${req.body.archive_type}`

            fs.exists(dir, (exists) => {

                if (!exists) {
                    fs.mkdir(dir, { recursive: true }, (err) => {
                        if (err) throw err;

                        con.query("INSERT into archives(archive_type) VALUES(?)",
                            [
                                req.body.archive_type
                            ],
                            function (err) {
                                if (err) throw err;
                                res.send({ message: "Create Folder Successful" })
                            });
                    });
                }
            });
        }
    })

    app.post('/create-file', (req, res) => {

        con.query("SELECT archive_id FROM archives WHERE archive_type=?",
            [
                req.body.archive_type
            ],
            function (err, archive_type) {
                if (err) throw err;

                var today = new Date();
                var cur = `${today.getFullYear()}/${months[today.getMonth()]}`
                var cur2 = `${today.getFullYear()}-${months[today.getMonth()]}-${today.getDate()}`

                var dir = `src/upload/${req.body.archive_type}/${cur}`

                fs.exists(dir, (exists) => {

                    if (!exists) {
                        fs.mkdirSync(dir, { recursive: true }, (err) => {
                            if (err) throw err;
                        });
                    }

                    var file_path = `${dir}/Archive-${cur2}-${req.body.file}`

                    fs.writeFile(file_path, req.body.file_path, { encoding: 'utf8' }, function (err) {
                        if (err) throw err;
                        con.query("INSERT into files(file_name, file_description, file_path, archive_type) VALUES(?, ?, ?, ?)",
                            [
                                req.body.file_name,
                                req.body.file_description,
                                file_path,
                                archive_type[0].archive_id
                            ],
                            function (err) {
                                if (err) throw err;
                                res.send({ message: "Create Archive Successful" })
                            });
                    })
                });
            });
    })

    app.post('/retrieve-file', (req, res) => {
        con.query("SELECT file_path from files where file_id=?",
            [
                req.body.file_id
            ],
            function (err, file_path) {
                if (err) throw err;

                fs.readFile(file_path[0].file_path, 'utf8', (err, file) => {
                    if (err) throw err;
                    res.send({ file })
                });
            });

    })

    app.post('/get-file-name', (req, res) => {
        con.query("SELECT file_path from files where file_id=?",
            [
                req.body.file_id
            ],
            function (err, file_name) {
                if (err) throw err;

                var file_path = file_name[0].file_path
                var separator = file_path.split("/")

                res.send({ file_name: separator[separator.length - 1] })

            });

    })

    app.get('/get-archive-type', (req, res) => {

        con.query("SELECT archive_type FROM archives where archive_id=?",
            [
                req.query.archive_id
            ],
            function (err, archive_type) {
                if (err) throw err;
                res.send({ archive_type })
            });
    })

    app.put('/update-file', (req, res) => {

        con.query("SELECT archive_id FROM archives WHERE archive_type=?",
            [
                req.body.archive_type
            ],
            function (err, archive_type) {
                if (err) throw err;

                const separator = req.body.input_file_path.split("/")
                const separator2 = separator[separator.length - 1].split("-")

                var dir = `src/upload/${req.body.archive_type}/${separator[3]}/${separator[4]}`

                fs.exists(dir, (exists) => {

                    if (!exists) {
                        fs.mkdirSync(dir, { recursive: true }, (err) => {
                            if (err) throw err;
                        });
                    }

                    var file_path = `${dir}/${separator2[0]}-${separator2[1]}-${separator2[2]}-${separator2[3]}-${req.body.file}`

                    fs.writeFile(file_path, req.body.file_path, { encoding: 'utf8' }, function (err) {
                        if (err) throw err;
                        con.query("UPDATE files SET file_name=?, file_description=?, file_path=?, archive_type=? where file_id=?",
                            [
                                req.body.file_name,
                                req.body.file_description,
                                file_path,
                                archive_type[0].archive_id,
                                req.body.file_id
                            ],
                            function (err) {
                                if (err) throw err;
                                res.send({ message: "Update Archive Successful" })
                            });
                    })
                });
            });
    })

    app.post('/update-archive', (req, res) => {

        if (req.body.archive_type.length > 16) {
            res.send({ error: "Maximum Length For Folder Name's 16 Letters" })
        } else if (regexArchive.test(req.body.archive_type) || regexSpecialCharacters.test(req.body.archive_type) || regexMetaCharacters.test(req.body.archive_type) || !regexNumerics.test(req.body.archive_type)) {
            res.send({ error: "Forbidden Folder Name" })
        } else {
            var oldDir = `src/upload/${req.body.input_archive_type}`
            var dir = `src/upload/${req.body.archive_type}`

            fs.rename(oldDir, dir, function (err) {
                if (err) throw err;

                con.query("UPDATE archives SET archive_type=? WHERE archive_id=?",
                    [
                        req.body.archive_type,
                        req.body.archive_id
                    ],
                    function (err) {
                        if (err) throw err;

                        con.query(`UPDATE files SET file_path=REPLACE(file_path, ?, ?) WHERE archive_type=?`,
                            [
                                req.body.input_archive_type,
                                req.body.archive_type,
                                req.body.archive_id

                            ],
                            function (err) {
                                if (err) throw err;
                                res.send({ message: "Update Folder Successful" })
                            });
                    });
            })
        }
    })

    app.post('/delete-file', (req, res) => {
        con.query("SELECT file_path FROM files where file_id=?",
            [
                req.body.file_id
            ],
            function (err, file_path) {
                if (err) throw err;

                fs.unlink(file_path[0].file_path, function (err) {
                    if (err) throw err;

                    file_path = file_path[0].file_path
                    var separator = file_path.split("Archive")

                    fs.readdir(separator[0], function (err, files) {
                        if (err) throw err;

                        if (!files.length) {
                            fs.rmdir(separator[0], (err) => {
                                if (err) throw err;

                                var child = separator[0]
                                var separator2 = child.split("/")
                                var parent = `${separator2[0]}/${separator2[1]}/${separator2[2]}/${separator2[3]}/`

                                fs.readdir(parent, function (err, files) {
                                    if (err) throw err;

                                    if (!files.length) {
                                        fs.rmdir(parent, (err) => {
                                            if (err) throw err;
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            });
    })

    app.delete('/delete-archive', (req, res) => {
        con.query("DELETE FROM files where file_id=?",
            [
                req.body.file_id
            ],
            function (err) {
                if (err) throw err;
                res.send({ message: "Delete Archive Successful" })
            });

    })

    app.post('/delete-archive-type', (req, res) => {

        con.query("SELECT archive_type FROM archives where archive_id=?",
            [
                req.body.archive_id
            ],
            function (err, archive_type) {
                if (err) throw err;

                var dir = `src/upload/${archive_type[0].archive_type}`

                fs.readdir(dir, function (err, files) {
                    if (err) throw err;

                    if (!files.length) {
                        fs.rmdir(dir, (err) => {
                            if (err) throw err;

                            con.query("DELETE FROM archives where archive_id=?",
                                [
                                    req.body.archive_id
                                ],
                                function (err) {
                                    if (err) throw err;
                                    res.send({ message: "Delete Folder Successful" })
                                });
                        });
                    } else {
                        res.send({ error: "Delete All Archives Inside This Folder First" })
                    }
                });
            });
    })

    app.post('/search-files', (req, res) => {
        con.query(`SELECT * FROM files WHERE file_name LIKE ?`,
            [
                `%${req.body.file_name}%`
            ],
            function (err, search_results) {
                if (err) throw err;
                res.send({ search_results })
            });

    })

}

build().then(
    app.listen(port, () => {
        console.log(`Hit File Management Services On Port ${port}`)
    })
)
