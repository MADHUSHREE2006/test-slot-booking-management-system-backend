const mongoose = require('mongoose')

module.exports = () =>{
mongoose.connect("mongodb://localhost:27017/sms_db")
    .then(() => { console.log("database connected") })
    .catch((err) => { console.log(err) })
}