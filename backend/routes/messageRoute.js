import express from "express";
import {
    addReactionToMessage,
    deleteMessageForEveryone,
    deleteMessageForMe,
    getMessage,
    removeReactionFromMessage,
    sendMessage
} from "../controllers/messageController.js";
import { messageUpload } from "../middleware/imageUpload.js";
import isAuthenticated from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, messageUpload("file"), sendMessage);
router.route("/reaction/:messageId").post(isAuthenticated, addReactionToMessage);
router.route("/reaction/:messageId").delete(isAuthenticated, removeReactionFromMessage);
router.route("/:messageId/me").delete(isAuthenticated, deleteMessageForMe);
router.route("/:messageId/everyone").delete(isAuthenticated, deleteMessageForEveryone);
router.route("/:id").get(isAuthenticated, getMessage);

export default router;