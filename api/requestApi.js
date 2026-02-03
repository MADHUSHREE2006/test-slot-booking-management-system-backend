const express = require("express")
const router = express.Router()
const auth = require("..//middlewares/auth.js")
const Request = require("..//models/requestModel.js")
const User = require("..//models/userModel.js")


router.post('/change-request/create', auth, async (req, res) => {
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

router.get('/change-request/my-requests', auth, async (req, res) => {
    const requests = await Request.find({ requestedBy: req.user })
        .populate('requestedTo', 'name email')
        .sort({ createdAt: -1 })
    res.json({ "requests": requests })
})
router.get('/requests/received', auth, async (req, res) => {
    const user = await User.findById(req.user)
    if (user.role !== "MANAGER") {
        return res.json({ "message": "Only managers can view received requests" })
    }

    const requests = await Request.find({ requestedTo: req.user })
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
    res.json({ "requests": requests })
})

router.put('/requests/:id/status', auth, async (req, res) => {
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

router.post('/requests/:id/comments', auth, async (req, res) => {
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
});

module.exports = router