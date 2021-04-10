require('dotenv').config();

/** # MONGOOSE SETUP #
/*  ================== */

/** 1) Install & Set up mongoose */
const mongoose = require('mongoose');

const express = require('express');
const mongo = require('mongodb');

const app = express();
const bodyParser = require('body-parser');
const moment = require('moment');

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


const dataSchema = new mongoose.Schema({
  _id: String,
  username: String,
  exercise: [
    {
      description: String, // Can't be called 'type' because Mongoose will think this is a type declaration for the object ie. 'String' || 'Number' etc.
      duration: Number,
      date: Date
    }
  ]
});

const Data = mongoose.model("Data", dataSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
  // console.log('this works...')
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/exercise/new-user", (req, res) => {
  res.json({ hello: "hi there..." });
});

//// Functionality ->
//////
/// User Story 1
app.post("/api/exercise/new-user", (req, res) => {
  let uname = req.body.username;
  // console.log(uname);
  // Perform db check for username
  Data.findOne({ username: uname }, (err, doc) => {
    // return apology if username taken:
    if (doc) {
      res.json("Error: Username already taken.");
    } else {
      // if unique create an id and add to db:
      let id = makeid();
      let data = new Data({
        _id: id,
        username: uname
      });
      // console.log(data);
      data.save(err, doc => {
        if (err) return console.log("Error: ", err);
        res.json({
          username: uname,
          _id: data._id
        });
      });
    }
  });
});

//// User Story 2
// Return array of users:
app.get("/api/exercise/users", (req, res) => {
  Data.find({}, (err, doc) => {
    if (err) return console.log("Error: ", err);
    let responseArray = [];
    for (let entry in doc) {
      responseArray.push({
        username: doc[entry].username,
        _id: doc[entry]._id
      });
    }
    res.json(responseArray);
  });
});

//// User Story 3
app.post("/api/exercise/add", (req, res) => {
  
  let input = req.body;
  // Check input contains required fields - send res message if not - set date to today/now if not given
  if (!input.userId || !input.description || !input.duration) {
    res.send(
      "Error: User ID, Description and Duration are required fields."
    );
  } else if (!input.date) {
    input.date = new Date();
  }
  let date = new Date(input.date).toDateString();
  let duration = parseInt(input.duration);
  
  // Create object to push into exercise array in db
  let exerciseInstance = {
    description: input.description,
    duration: duration,
    date: handleDate(date) 
  };
  // Find user in db and update
  Data.findByIdAndUpdate(
    input.userId,
    { $push: { exercise: exerciseInstance } },
    (err, doc) => {
      if (err) return console.log("Error: ", err);
      res.json({
        username: doc.username,
        description: exerciseInstance.description,
        duration: exerciseInstance.duration,
        _id: doc._id,
        date: exerciseInstance.date
      });
    }
  );
});

//// User Story 4 & 5 ->
app.get("/api/exercise/log", (req, res) => {
  // Get queries from req object
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  // Create object to populate for response
  let userInfo = {};

  // If the user doesn't specify from and to dates:
  if (!from && !to) {
    // Check db for provided userId
    Data.findById(userId, (err, doc) => {
      if (err) return console.log("Error finding ID: ", err);
      if (doc == null) {
        res.send("Error: User not found.");
      } else {
        let exercise = doc.exercise;
        let log = [];

        for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
          log.push({
            activity: exercise[i].description,
            duration: exercise[i].duration,
            date: exercise[i].date
          });
        }
        userInfo = {
          _id: userId,
          username: doc.username,
          count: log.length,
          log: log
        };
        res.json(userInfo);
      }
    });
  // If the user specifies from and to dates:
  } else {
    Data.find()
      .where("_id")
      .equals(userId)
      .where("exercise.date")
      .gt(from)
      .lt(to)
      .exec((err, doc) => {
        if (err) return console.log("Error: ", err);
        if (doc.length == 0) {
          res.send(
            "Error: No data found."
          );
        } else {
          let exercise = doc[0].exercise;
          let log = [];
          for (let i = 0; i < limitCheck(limit, exercise.length); i++) {
            log.push({
              activity: exercise[i].description,
              duration: exercise[i].duration,
              date: exercise[i].date
            });
          }
          userInfo = {
            _id: userId,
            username: doc[0].username,
            count: log.length,
            log: log
          };
          res.json(userInfo);
        }
      });
  }
  // Function to check limit and use in for loop that creates log array
  let limitCheck = (i, j) => {
    if (i <= j) {
      return i;
    } else {
      return j;
    }
  };
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Function for random id ->
function makeid() {
  //makes a random shortened ID
  let randomText = "";
  //make alphanumeric
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 5; i++) {
    randomText += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return randomText;
}


// use momentJS to validate dates
const handleDate = date => {
  if (!date) {
    return moment().format("YYYY-MM-DD");
  } else if (!moment(date, "YYYY-MM-DD").isValid()) {
    return moment().format("YYYY-MM-DD");
  } else {
    return date;
  }
};
