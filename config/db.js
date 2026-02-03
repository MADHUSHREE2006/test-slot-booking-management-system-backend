require("dotenv").config();
const mongoose = require('mongoose');

const connectDB = () => {
    mongoose.connect(process.env.DB_URL)
        .then(() => { console.log("database connected") })
        .catch((err) => { console.log(err) });
};

module.exports = connectDB;