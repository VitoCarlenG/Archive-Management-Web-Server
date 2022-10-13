async function routes () {

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })

    console.log("routes Is Okay")

}

routes()

module.exports = {
    routes
}
