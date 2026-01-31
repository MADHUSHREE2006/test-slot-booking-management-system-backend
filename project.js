const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const app = express()
const jwt = require("jsonwebtoken")

app.use(express.json())
const secretCode = "asdfghjklqwertyuiop"

mongoose.connect("mongodb://localhost:27017/sms_db")
    .then(() => { console.log("database connected") })
    .catch((err) => { console.log(err) })

// ================== SCHEMAS ==================
// User Schema
const userSchema = mongoose.Schema({
    name: String,
    email: String,
    role: String,
    age: Number,
    password: String
})

// Request Schema
const requestSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: String,
    requestedOn: {
        type: Date,
        default: Date.now
    },
    actionTakenOn: Date,
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    requestedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    comments: [{
        comment: String,
        commentedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        commentedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
})

// Slot Schema
const slotSchema = new mongoose.Schema({
    title: String,
    description: String,
    date: Date,
    startTime: String,
    endTime: String,
    maxCapacity: {
        type: Number,
        default: 1
    },
    bookedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        bookedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

// ================== MODELS ==================
const User = mongoose.model("User", userSchema)
const Request = mongoose.model("Request", requestSchema)
const Slot = mongoose.model("Slot", slotSchema)

// ================== MIDDLEWARE ==================
function auth(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.json({ "message": "Authorization missing" })
    }
    try {
        const token = authorization.split(" ")[1]
        const decode = jwt.verify(token, secretCode)
        req.user = decode.user
        next()
    } catch (err) {
        console.log(err)
        return res.json({ "message": "Token is invalid or expired" })
    }
}

// ================== AUTH ENDPOINTS ==================
app.post('/users/signup', async (req, res) => {
    if (!req.body) {
        return res.json({ "message": "Request body is required" })
    }

    const name = req.body.name
    const email = req.body.email
    const role = req.body.role
    const age = req.body.age
    const password = req.body.password

    if (!email || !password || !role || !name || !age) {
        return res.json({ "message": "All fields are required: name, email, role, age, password" })
    }

    if (role !== role.toUpperCase()) {
        return res.json({ "message": "Role must be in capital letters" })
    }

    if (password.length < 8) {
        return res.json({ "message": "Password must be at least 8 characters" })
    }

    const userCheck = await User.findOne({ email: email })
    if (userCheck) {
        return res.json({ "message": "email is already exist" })
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
    res.json({ "message": "success" })
})

app.post("/users/login", async (req, res) => {
    if (!req.body) {
        return res.json({ "message": "Request body is required" })
    }

    const email = req.body.email
    if (!email) {
        return res.json({ "message": "Email is required" })
    }

    const user = await User.findOne({ email: email })
    if (!user) {
        return res.json({ "message": "email is invalid" })
    }

    const password = req.body.password
    if (!password) {
        return res.json({ "message": "Password is required" })
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password)
    if (!isPasswordMatching) {
        return res.json({ "message": "password invalid" })
    }

    try {
        const token = jwt.sign(
            { user: user._id },
            secretCode,
            { expiresIn: "1h" }
        )
        return res.json({ message: "login successful", token: token })
    } catch (err) {
        console.log(err)
        return res.json({ "message": "server error" })
    }
})

// ================== REQUEST ENDPOINTS ==================
app.post('/change-request/create', auth, async (req, res) => {
    const title = req.body.title;
    const description = req.body.description
    const requestedTo = req.body.requestedTo

    if (!title || !description || !requestedTo) {
        return res.json({ "message": "Please send all details" })
    }

    const request = new Request({
        title: title,
        description: description,
        status: "PENDING",
        requestedBy: req.user,
        requestedTo: requestedTo,
    });

    await request.save()
    return res.json({ "message": "request created" })
})

app.get('/change-request/my-requests', auth, async (req, res) => {
    const requests = await Request.find({ requestedBy: req.user })
        .populate('requestedTo', 'name email')
        .sort({ createdAt: -1 })
    res.json({ "requests": requests })
})

app.get('/requests/received', auth, async (req, res) => {
    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can view received requests" })
    }

    const requests = await Request.find({ requestedTo: req.user })
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
    res.json({ "requests": requests })
})

app.put('/requests/:id/status', auth, async (req, res) => {
    const { status, comment } = req.body
    const requestId = req.params.id

    if (!status) {
        return res.json({ "message": "Status is required" })
    }

    const request = await Request.findById(requestId)
    if (!request) {
        return res.json({ "message": "Request not found" })
    }

    if (request.requestedTo.toString() !== req.user.toString()) {
        return res.json({ "message": "Not authorized to update this request" })
    }

    request.status = status
    request.actionTakenOn = new Date()

    if (comment) {
        request.comments.push({
            comment: comment,
            commentedBy: req.user
        })
    }

    await request.save()
    res.json({ "message": "Request status updated successfully" })
})

app.post('/requests/:id/comments', auth, async (req, res) => {
    const { comment } = req.body
    const requestId = req.params.id

    if (!comment) {
        return res.json({ "message": "Comment is required" })
    }

    const request = await Request.findById(requestId)
    if (!request) {
        return res.json({ "message": "Request not found" })
    }

    request.comments.push({
        comment: comment,
        commentedBy: req.user
    })

    await request.save()
    res.json({ "message": "Comment added successfully" })
})

// ================== SLOT ENDPOINTS ==================
app.post('/slots/create', auth, async (req, res) => {
    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can create slots" })
    }

    const { title, description, date, startTime, endTime, maxCapacity } = req.body

    if (!title || !date || !startTime || !endTime) {
        return res.json({ "message": "Title, date, startTime and endTime are required" })
    }

    const slot = new Slot({
        title: title,
        description: description,
        date: date,
        startTime: startTime,
        endTime: endTime,
        maxCapacity: maxCapacity || 1,
        createdBy: req.user
    })

    await slot.save()
    res.json({ "message": "Slot created successfully" })
})

app.get('/slots/available', auth, async (req, res) => {
    const slots = await Slot.find({
        isActive: true,
        $expr: { $lt: [{ $size: "$bookedBy" }, "$maxCapacity"] }
    })
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 })

    res.json({ "slots": slots })
})

app.post('/slots/:id/book', auth, async (req, res) => {
    const slotId = req.params.id

    const slot = await Slot.findById(slotId)
    if (!slot) {
        return res.json({ "message": "Slot not found" })
    }

    if (!slot.isActive) {
        return res.json({ "message": "Slot is not available" })
    }

    const alreadyBooked = slot.bookedBy.some(booking =>
        booking.user.toString() === req.user.toString()
    )

    if (alreadyBooked) {
        return res.json({ "message": "You have already booked this slot" })
    }

    if (slot.bookedBy.length >= slot.maxCapacity) {
        return res.json({ "message": "Slot is fully booked" })
    }

    slot.bookedBy.push({ user: req.user })
    await slot.save()

    res.json({ "message": "Slot booked successfully" })
})

app.get('/slots/my-bookings', auth, async (req, res) => {
    const slots = await Slot.find({
        "bookedBy.user": req.user
    })
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 })

    res.json({ "bookings": slots })
})

app.post('/slots/:id/cancel', auth, async (req, res) => {
    const slotId = req.params.id

    const slot = await Slot.findById(slotId)
    if (!slot) {
        return res.json({ "message": "Slot not found" })
    }

    slot.bookedBy = slot.bookedBy.filter(booking =>
        booking.user.toString() !== req.user.toString()
    )

    await slot.save()
    res.json({ "message": "Booking cancelled successfully" })
})

// ================== MANAGER ENDPOINTS ==================
app.get('/manager/slots', auth, async (req, res) => {
    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can view all slots" })
    }

    const slots = await Slot.find({ createdBy: req.user })
        .populate('bookedBy.user', 'name email')
        .sort({ createdAt: -1 })

    res.json({ "slots": slots })
})

app.put('/slots/:id/status', auth, async (req, res) => {
    const { isActive } = req.body
    const slotId = req.params.id

    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can update slot status" })
    }

    const slot = await Slot.findById(slotId)
    if (!slot) {
        return res.json({ "message": "Slot not found" })
    }

    if (slot.createdBy.toString() !== req.user.toString()) {
        return res.json({ "message": "Not authorized to update this slot" })
    }

    slot.isActive = isActive
    await slot.save()

    res.json({ "message": "Slot status updated successfully" })
})

app.get('/manager/stats', auth, async (req, res) => {
    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can view stats" })
    }

    const totalSlots = await Slot.countDocuments({ createdBy: req.user })
    const activeSlots = await Slot.countDocuments({
        createdBy: req.user,
        isActive: true
    })
    const pendingRequests = await Request.countDocuments({
        requestedTo: req.user,
        status: "PENDING"
    })

    const slots = await Slot.find({ createdBy: req.user })
    let totalBookings = 0
    slots.forEach(slot => {
        totalBookings += slot.bookedBy.length
    })

    res.json({
        totalSlots: totalSlots,
        activeSlots: activeSlots,
        pendingRequests: pendingRequests,
        totalBookings: totalBookings
    })
})

// ================== USER ENDPOINTS ==================
app.get('/user/profile', auth, async (req, res) => {
    const user = await User.findById(req.user).select('-password')
    res.json({ "user": user })
})

app.get('/user/dashboard', auth, async (req, res) => {
    const user = await User.findById(req.user)

    const myRequests = await Request.countDocuments({ requestedBy: req.user })
    const pendingRequests = await Request.countDocuments({
        requestedBy: req.user,
        status: "PENDING"
    })
    const myBookings = await Slot.countDocuments({
        "bookedBy.user": req.user
    })

    res.json({
        user: {
            name: user.name,
            email: user.email,
            role: user.role
        },
        stats: {
            myRequests: myRequests,
            pendingRequests: pendingRequests,
            myBookings: myBookings
        }
    })
})

// ================== UTILITY ENDPOINTS ==================
app.get('/users', auth, async (req, res) => {
    const users = await User.find({ _id: { $ne: req.user } })
        .select('name email role')
        .sort({ name: 1 })

    res.json({ "users": users })
})

app.get('/requests/:id', auth, async (req, res) => {
    const requestId = req.params.id

    const request = await Request.findById(requestId)
        .populate('requestedBy', 'name email')
        .populate('requestedTo', 'name email')
        .populate('comments.commentedBy', 'name email')

    if (!request) {
        return res.json({ "message": "Request not found" })
    }

    if (request.requestedBy._id.toString() !== req.user.toString() &&
        request.requestedTo._id.toString() !== req.user.toString()) {
        return res.json({ "message": "Access denied" })
    }

    res.json({ "request": request })
})

app.get('/slots/:id', auth, async (req, res) => {
    const slotId = req.params.id

    const slot = await Slot.findById(slotId)
        .populate('createdBy', 'name email')
        .populate('bookedBy.user', 'name email')

    if (!slot) {
        return res.json({ "message": "Slot not found" })
    }

    res.json({ "slot": slot })
})

// ================== SERVER START ==================
app.listen(3000)