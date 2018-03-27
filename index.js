//Dependencies
require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const request = require("request");
const session = require('express-session');
const app = express();

//setting view
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(ejsLayouts);
app.use(express.static(__dirname + '/public'));
//Controllers
app.get('/', (req, res) => {
    res.render("Home/addReceipt");
});
app.use("/receipt", require("./controllers/receipt"));
//Exports
const server = app.listen(process.env.PORT || 3000);
module.exports = server;