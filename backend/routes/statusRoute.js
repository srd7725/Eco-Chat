import express from "express";
import {
    createStatus,
    deleteStatus,
    getStatus,
    getStatusImage,
    getStatusViewers,
    getUserStatuses,
    getVisibleStatuses,
    recordStatusView
} from "../controllers/statusController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { imageUpload } from "../middleware/imageUpload.js";

const router = express.Router();

router.route("/")
    .get(isAuthenticated, getVisibleStatuses)
    .post(isAuthenticated, imageUpload("image"), createStatus);
router.route("/user/:userId").get(isAuthenticated, getUserStatuses);
router.route("/:statusId/image").get(isAuthenticated, getStatusImage);
router.route("/:statusId/viewers").get(isAuthenticated, getStatusViewers);
router.route("/:statusId/view").post(isAuthenticated, recordStatusView);
router.route("/:statusId")
    .get(isAuthenticated, getStatus)
    .delete(isAuthenticated, deleteStatus);

export default router;
