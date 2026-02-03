const express = require("express")
const bcrypt = require("bcrypt")
const User = require("../models/userModel")

const router = express.Router()

router.post('/signup', async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const role = req.body.role
    const age = req.body.age
    const password = req.body.password
   
    if(!email || !password ){
        return res.json({"message":"invalid request"})
    }
    
    const userCheck = await User.findOne({email:email})
    console.log("userCheck:",userCheck)
    if(userCheck){
        return res.json({"message":"email is already exist"})
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
        name: name,
        email: email,
        role: role,
        age: age,
        password: hashedPassword
    })
    
    await user.save()
    res.json({"message":"success"})
})

module.exports = router