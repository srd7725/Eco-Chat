import mongoose from "mongoose";
import { Conversation } from "../models/conversationModel.js";
import { Status } from "../models/statusModel.js";
import { User } from "../models/userModel.js";
import {
    deleteUploadedImage,
    getUploadedImageFilePath,
    storeUploadedImage
} from "../middleware/imageUpload.js";
import { emitToUser } from "../socket/socket.js";

const getContactIds = async (userId) => {
    const conversations = await Conversation.find({ participants: userId })
        .select("participants")
        .lean();
    return [...new Set(conversations
        .flatMap(({ participants }) => participants.map(String))
        .filter((participantId) => participantId !== String(userId)))];
};

const populateStatusOwner = (query) => query.populate("userId", "fullName username profilePhoto gender");
const isOwner = (status, userId) => String(status.userId?._id || status.userId) === String(userId);
const statusForViewer = (status, userId) => {
    const plainStatus = status.toObject ? status.toObject() : { ...status };
    if (plainStatus.image?.startsWith("/uploads/status/")) {
        plainStatus.image = `/api/v1/status/${plainStatus._id}/image`;
    }
    plainStatus.type ||= plainStatus.image && plainStatus.text
        ? "mixed"
        : plainStatus.image ? "image" : "text";
    if (isOwner(plainStatus, userId)) {
        plainStatus.viewCount = plainStatus.viewers?.length || 0;
    } else {
        delete plainStatus.viewers;
        delete plainStatus.viewCount;
    }
    return plainStatus;
};

const canViewStatus = async (status, viewerId) => {
    if (isOwner(status, viewerId)) return true;
    return Boolean(await Conversation.exists({
        participants: { $all: [viewerId, status.userId?._id || status.userId] }
    }));
};

export const createStatus = async (req, res) => {
    let imagePath;
    try {
        const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
        if (!text && !req.file) {
            return res.status(400).json({ message: "A status needs text or an image." });
        }
        if (text.length > 700) {
            return res.status(400).json({ message: "Status text cannot exceed 700 characters." });
        }

        imagePath = await storeUploadedImage(req.file, "status");
        const status = await Status.create({
            userId: req.id,
            text,
            image: imagePath || undefined,
            type: imagePath ? (text ? "mixed" : "image") : "text",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            viewers: []
        });
        imagePath = null;
        const populatedStatus = await populateStatusOwner(Status.findById(status._id));
        const statusResponse = statusForViewer(populatedStatus, req.id);
        const contactStatus = { ...statusResponse };
        delete contactStatus.viewCount;
        delete contactStatus.viewers;
        const contactIds = await getContactIds(req.id);
        contactIds.forEach((contactId) => emitToUser(contactId, "newStatus", contactStatus));
        return res.status(201).json({ status: statusResponse });
    } catch (error) {
        if (imagePath) {
            try {
                await deleteUploadedImage(imagePath);
            } catch (cleanupError) {
                console.error("Unable to remove an unreferenced status image:", cleanupError);
            }
        }
        console.error("Failed to create status:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Unable to create status."
        });
    }
};

export const getVisibleStatuses = async (req, res) => {
    try {
        const contactIds = await getContactIds(req.id);
        const statuses = await populateStatusOwner(Status.find({
            expiresAt: { $gt: new Date() },
            userId: { $in: [req.id, ...contactIds] }
        })).sort({ createdAt: -1 });
        return res.status(200).json(statuses.map((status) => statusForViewer(status, req.id)));
    } catch (error) {
        console.error("Failed to fetch visible statuses:", error);
        return res.status(500).json({ message: "Unable to fetch statuses." });
    }
};

export const getUserStatuses = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user id." });
        }
        const isAllowed = String(req.id) === String(userId) || Boolean(await Conversation.exists({
            participants: { $all: [req.id, userId] }
        }));
        if (!isAllowed) {
            return res.status(403).json({ message: "You cannot view this user's statuses." });
        }
        const statuses = await populateStatusOwner(Status.find({
            expiresAt: { $gt: new Date() },
            userId
        })).sort({ createdAt: 1 });
        return res.status(200).json(statuses.map((status) => statusForViewer(status, req.id)));
    } catch (error) {
        console.error("Failed to fetch user statuses:", error);
        return res.status(500).json({ message: "Unable to fetch user statuses." });
    }
};

export const getStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        if (!mongoose.isValidObjectId(statusId)) {
            return res.status(400).json({ message: "Invalid status id." });
        }
        const status = await populateStatusOwner(Status.findOne({
            _id: statusId,
            expiresAt: { $gt: new Date() }
        }));
        if (!status) return res.status(404).json({ message: "Active status not found." });
        if (!(await canViewStatus(status, req.id))) {
            return res.status(403).json({ message: "You cannot view this status." });
        }
        return res.status(200).json({ status: statusForViewer(status, req.id) });
    } catch (error) {
        console.error("Failed to fetch status:", error);
        return res.status(500).json({ message: "Unable to fetch status." });
    }
};

export const getStatusImage = async (req, res) => {
    try {
        const { statusId } = req.params;
        if (!mongoose.isValidObjectId(statusId)) {
            return res.status(400).json({ message: "Invalid status id." });
        }
        const status = await Status.findOne({
            _id: statusId,
            expiresAt: { $gt: new Date() }
        }).select("userId image");
        if (!status) return res.status(404).json({ message: "Active status not found." });
        if (!(await canViewStatus(status, req.id))) {
            return res.status(403).json({ message: "You cannot view this status." });
        }
        const filePath = getUploadedImageFilePath(status.image);
        if (!filePath) return res.status(404).json({ message: "Status image not found." });
        return res.sendFile(filePath, {
            headers: { "Cache-Control": "private, no-store" }
        });
    } catch (error) {
        console.error("Failed to fetch status image:", error);
        return res.status(500).json({ message: "Unable to fetch status image." });
    }
};

export const recordStatusView = async (req, res) => {
    try {
        const { statusId } = req.params;
        if (!mongoose.isValidObjectId(statusId)) {
            return res.status(400).json({ message: "Invalid status id." });
        }
        const activeFilter = { _id: statusId, expiresAt: { $gt: new Date() } };
        const status = await Status.findOne(activeFilter).select("userId viewers");
        if (!status) return res.status(404).json({ message: "Active status not found." });
        if (!(await canViewStatus(status, req.id))) {
            return res.status(403).json({ message: "You cannot view this status." });
        }
        if (isOwner(status, req.id)) {
            return res.status(200).json({
                viewed: false
            });
        }

        const viewedAt = new Date();
        const updatedStatus = await Status.findOneAndUpdate(
            {
                ...activeFilter,
                "viewers.userId": { $ne: new mongoose.Types.ObjectId(req.id) }
            },
            { $push: { viewers: { userId: req.id, viewedAt } } },
            { new: true, projection: { userId: 1, viewers: 1 } }
        );

        if (!updatedStatus) {
            const currentStatus = await Status.findOne(activeFilter).select("userId viewers");
            if (!currentStatus) return res.status(404).json({ message: "Active status not found." });
            return res.status(200).json({ viewed: false });
        }

        const viewer = await User.findById(req.id).select("fullName username profilePhoto gender").lean();
        const viewerRecord = {
            userId: {
                _id: viewer._id,
                fullName: viewer.fullName,
                username: viewer.username,
                profilePhoto: viewer.profilePhoto,
                gender: viewer.gender
            },
            viewedAt
        };
        const viewCount = updatedStatus.viewers.length;
        emitToUser(status.userId, "statusViewed", {
            statusId: String(status._id),
            viewCount,
            viewer: viewerRecord
        });
        return res.status(200).json({ viewed: true });
    } catch (error) {
        console.error("Failed to record status view:", error);
        return res.status(500).json({ message: "Unable to record status view." });
    }
};

export const getStatusViewers = async (req, res) => {
    try {
        const { statusId } = req.params;
        if (!mongoose.isValidObjectId(statusId)) {
            return res.status(400).json({ message: "Invalid status id." });
        }
        const status = await Status.findOne({
            _id: statusId,
            expiresAt: { $gt: new Date() }
        }).populate("viewers.userId", "fullName username profilePhoto gender");
        if (!status) return res.status(404).json({ message: "Active status not found." });
        if (!isOwner(status, req.id)) {
            return res.status(403).json({ message: "Only the status owner can view its viewers." });
        }
        return res.status(200).json({
            viewCount: status.viewers.length,
            viewers: status.viewers
        });
    } catch (error) {
        console.error("Failed to fetch status viewers:", error);
        return res.status(500).json({ message: "Unable to fetch status viewers." });
    }
};

export const deleteStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.statusId)) {
            return res.status(400).json({ message: "Invalid status id." });
        }
        const contactIds = await getContactIds(req.id);
        const status = await Status.findOneAndDelete({
            _id: req.params.statusId,
            userId: req.id
        });
        if (!status) return res.status(404).json({ message: "Status not found." });

        const deletedStatusId = String(status._id);
        [...contactIds, String(req.id)].forEach((userId) =>
            emitToUser(userId, "statusDeleted", { statusId: deletedStatusId })
        );
        try {
            await deleteUploadedImage(status.image);
        } catch (error) {
            console.error("Unable to remove deleted status image:", error);
        }
        return res.status(200).json({ message: "Status deleted." });
    } catch (error) {
        console.error("Failed to delete status:", error);
        return res.status(500).json({ message: "Unable to delete status." });
    }
};
