require('dotenv').config();

/** # MONGOOSE SETUP #
/*  ================== */

/** 1) Install & Set up mongoose */
const mongoose = require('mongoose');



const express = require('express');
const mongo = require('mongodb');

const dns = require('dns');
const URL = require('url').URL;  // a module URL has utilities for URL resolution and parsing
const app = express();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that API is remotely testable by FCC 
let cors = require('cors');
app.use(cors());

// basic configuration 
let port = process.env.PORT || 3000;


mongoose.connect(process.env.MONGO_URI);


// connect to the DB
let db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (error) => {
  if (error) console.log(error);
    console.log("connection to the DB successful");
});

// create a new Schema with following schema types
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
}, {timestamps: true});

// create a model that allows to create instance of objects--documents
const Model = mongoose.model('shortURL', urlSchema);
module.exports = Model;

// this project needs to parse POST bodies--the body-parser mounted here
let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: false}));  // configuration option to use the classic encoding
app.use(bodyParser.json())

// to serve the static CSS file from the public folder by using the 
// built-in middleware function in Express
app.use('/', express.static(process.cwd() + '/public'));

// routing--how the app responds to a client request to a particular endpoint
// when the route is matched, the handler function is executed--responds with the index.html file
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});


function urlIsValid(url) {
 return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test( url );
}


app.post('/api/shorturl/new', (req, res, next) => {
  const originalURL = req.body.url;

  if (!urlIsValid(originalURL)) {
    res.json({ "error": "invalid url" });

  } else {

    const urlObject = new URL(originalURL);
    dns.lookup(urlObject.hostname, (err,address,family) =>{
      if (err){
        res.json({
          original_url : originalURL,
          short_url: "Invalid URL"
        });

      } else {
        let shortenedURL = Math.floor(Math.random()*100000).toString();

        let data = new Model({
          original_url: originalURL,
          short_url: shortenedURL
        });

        data.save((err, data) =>{
          if (err) {
            console.error(err);
          }
        });

        res.json({
          original_url: originalURL,
          short_url: shortenedURL
        })
      }
    })
  }

});


app.get('/api/shorturl/:urlToForward', (req, res, next) => {
  let shortenedURL = req.params.urlToForward;
  
  Model.findOne({short_url: shortenedURL}, (err, data) => {
    if (err) {
      res.send("Unknown url")
    }
    res.redirect(301, data.original_url);
  });
});

// listen for requests
app.listen(port, () => {
  console.log('Node.js listening ...');
});


