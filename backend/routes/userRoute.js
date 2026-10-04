import express from "express";
import {
    getOtherUsers,
    login,
    logout,
    register,
    removeProfilePhoto,
    updateProfile
} from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { imageUpload } from "../middleware/imageUpload.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/profile")
    .patch(isAuthenticated, imageUpload("profilePhoto"), updateProfile);
router.route("/profile/photo").delete(isAuthenticated, removeProfilePhoto);
router.route("/").get(isAuthenticated,getOtherUsers);

export default router;