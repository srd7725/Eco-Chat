import mongoose from "mongoose";

const statusModel = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    text: {
        type: String,
        trim: true,
        maxlength: 700
    },
    image: {
        type: String
    },
    type: {
        type: String,
        enum: ["text", "image", "mixed"],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    viewers: [{
        _id: false,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        viewedAt: {
            type: Date,
            required: true
        }
    }]
}, { timestamps: true });

statusModel.index({ userId: 1, createdAt: -1, expiresAt: 1 });

export const Status = mongoose.model("Status", statusModel);
