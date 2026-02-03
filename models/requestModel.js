const mongoose = require("mongoose")
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

const Request = mongoose.model("Request", requestSchema)

module.exports = Request