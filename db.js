const { MongoClient } = require("mongodb");

let dbConnection;

const connectToDb = (callback) => {
  const MONGOURL = process.env.MONGO_URL;

  MongoClient.connect(MONGOURL)
    .then((client) => {
      dbConnection = client.db();
      return callback();
    })
    .catch((err) => {
      console.log(err);
      return callback(err);
    });
};

const getDb = () => dbConnection;

module.exports = { connectToDb, getDb };
