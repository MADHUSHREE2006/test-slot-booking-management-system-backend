require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db.js');
const userApi = require('./api/userApi.js');
const requestApi = require('./api/requestApi.js');
const dns = require('node:dns');

const app = express ()
app.use(express.json());

dns.setServers(['8.8.8.8', '1.1.1.1']);

connectDB()

app.use("/users",userApi)
app.use("/requests",requestApi)

app.listen(process.env.PORT, () => {
    console . log("server is running on", process.env.PORT)
})
