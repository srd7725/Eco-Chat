import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";
import { storeUploadedMessageFile } from "../middleware/imageUpload.js";
import { emitToUser } from "../socket/socket.js";

const emitUpdatedMessage = (message) => {
    const recipients = [String(message.senderId), String(message.receiverId)];
    recipients.forEach((userId) => {
        emitToUser(userId, "messageReactionUpdated", {
            messageId: message._id,
            message
        });
    });
};

const emitDeleteEvent = (message) => {
    const recipients = [String(message.senderId), String(message.receiverId)];
    recipients.forEach((userId) => {
        emitToUser(userId, "messageDeleted", {
            messageId: message._id,
            message
        });
    });
};

export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const incomingMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
        const uploadedFile = req.file || null;

        if (!incomingMessage && !uploadedFile) {
            return res.status(400).json({ message: "Message text or attachment is required." });
        }

        let attachmentData = null;
        if (uploadedFile) {
            const savedFileUrl = await storeUploadedMessageFile(uploadedFile);
            const isImage = uploadedFile.mimetype.startsWith("image/");
            attachmentData = {
                messageType: isImage ? "image" : "file",
                fileUrl: savedFileUrl,
                fileName: uploadedFile.originalname,
                fileSize: uploadedFile.size,
                mimeType: uploadedFile.mimetype
            };
        }

        const textPreview = incomingMessage || (
            attachmentData?.messageType === "image"
                ? "📷 Photo"
                : attachmentData?.fileName || ""
        );

        let gotConversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]},
        });

        if(!gotConversation){
            gotConversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: textPreview,
            messageType: attachmentData?.messageType || "text",
            fileUrl: attachmentData?.fileUrl || "",
            fileName: attachmentData?.fileName || "",
            fileSize: attachmentData?.fileSize || 0,
            mimeType: attachmentData?.mimeType || "",
            reactions: []
        });
        if(newMessage){
            gotConversation.messages.push(newMessage._id);
        };
        

        await Promise.all([gotConversation.save(), newMessage.save()]);
         
        // SOCKET IO
        emitToUser(receiverId, "newMessage", newMessage);
        return res.status(201).json({
            newMessage
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || "Unable to send message." });
    }
}

export const addReactionToMessage = async (req,res) => {
    try {
        const userId = req.id;
        const { messageId } = req.params;
        const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required." });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const existingReaction = message.reactions.find((reaction) => String(reaction.userId) === String(userId));
        if (existingReaction) {
            if (existingReaction.emoji === emoji) {
                message.reactions = message.reactions.filter(
                    (reaction) => !(String(reaction.userId) === String(userId) && reaction.emoji === emoji)
                );
                await message.save();
                emitUpdatedMessage(message);
                return res.status(200).json({
                    message,
                    action: "removed"
                });
            }

            existingReaction.emoji = emoji;
            existingReaction.createdAt = new Date();
            await message.save();
            emitUpdatedMessage(message);
            return res.status(200).json({
                message,
                action: "updated"
            });
        }

        message.reactions.push({
            userId,
            emoji,
            createdAt: new Date()
        });
        await message.save();
        emitUpdatedMessage(message);
        return res.status(200).json({
            message,
            action: "added"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to update reaction." });
    }
};

export const removeReactionFromMessage = async (req,res) => {
    try {
        const userId = req.id;
        const { messageId } = req.params;
        const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const beforeCount = message.reactions.length;
        message.reactions = message.reactions.filter((reaction) => {
            const sameUser = String(reaction.userId) === String(userId);
            if (!emoji) return !sameUser;
            return !(sameUser && reaction.emoji === emoji);
        });

        if (message.reactions.length === beforeCount) {
            return res.status(200).json({
                message,
                action: "none"
            });
        }

        await message.save();
        emitUpdatedMessage(message);
        return res.status(200).json({
            message,
            action: "removed"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to remove reaction." });
    }
};

export const deleteMessageForMe = async (req, res) => {
    try {
        const userId = req.id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (message.deletedForEveryone) {
            return res.status(200).json({ message, action: "already_deleted_everyone" });
        }

        const alreadyDeleted = message.deletedFor.some(
            (entry) => String(entry) === String(userId)
        );

        if (!alreadyDeleted) {
            message.deletedFor.push(userId);
            message.deletedAt = new Date();
            await message.save();
        }

        emitToUser(userId, "messageDeleted", {
            messageId: message._id,
            message
        });

        return res.status(200).json({
            message,
            action: "deleted_for_me"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to delete message for you." });
    }
};

export const deleteMessageForEveryone = async (req, res) => {
    try {
        const userId = req.id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        if (String(message.senderId) !== String(userId)) {
            return res.status(403).json({ message: "You can only delete your own messages for everyone." });
        }

        if (message.deletedForEveryone) {
            return res.status(200).json({ message, action: "already_deleted_everyone" });
        }

        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        message.message = "This message was deleted";
        message.messageType = "text";
        message.fileUrl = "";
        message.fileName = "";
        message.fileSize = 0;
        message.mimeType = "";
        message.reactions = [];
        message.deletedFor = Array.from(new Set([
            ...message.deletedFor.map((entry) => String(entry)),
            String(message.senderId),
            String(message.receiverId)
        ])).map((entry) => entry);

        await message.save();
        emitDeleteEvent(message);

        return res.status(200).json({
            message,
            action: "deleted_for_everyone"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to delete message for everyone." });
    }
};

export const getMessage = async (req,res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.id;
        const conversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]}
        }).populate({
            path: "messages",
            options: { sort: { createdAt: 1, _id: 1 } }
        });
        return res.status(200).json(conversation?.messages);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Unable to fetch messages." });
    }
}