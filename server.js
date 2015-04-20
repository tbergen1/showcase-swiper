// Dependencies
var express = require("express"),
    app = express(),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    hostname = process.env.HOSTNAME || 'localhost',
    port = parseInt(process.env.PORT, 10) || 3000,
    publicDir = process.argv[2] || __dirname + '/public',
    env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Config
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(publicDir));
app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Routes
app.get("/", function(req, res) {
    res.render("index");
});

// Start Server
console.log("****** Servant Front-End Boilerplate listening at http://%s:%s", hostname, port);
app.listen(port, hostname);