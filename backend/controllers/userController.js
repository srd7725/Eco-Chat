import { User } from "../models/userModel.js";
import mongoose from "mongoose";
import { Message } from "../models/messageModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { deleteUploadedImage, storeUploadedImage } from "../middleware/imageUpload.js";
import { emitToAllUsers } from "../socket/socket.js";

export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword } = req.body;
        const gender = typeof req.body.gender === "string" ? req.body.gender.trim().toLowerCase() : "";
        if (!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (gender !== "male" && gender !== "female") {
            return res.status(400).json({ message: "Choose a valid gender." });
        }
        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }
        if (password.length > 15) {
            return res.status(400).json({ message: "Password must not exceed 15 characters." });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password do not match" });
        }

        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "Username already exit try different" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const avatarTop = gender === "male" ? "shortFlat" : "straight02";
        const profilePhoto = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}&top=${avatarTop}&topProbability=100`;

        await User.create({
            fullName,
            username,
            password: hashedPassword,
            profilePhoto,
            gender
        });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        };
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            })
        };
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            })
        };
        const tokenData = {
            userId: user._id
        };

        const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'strict' }).json({
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto,
            gender: user.gender
        });

    } catch (error) {
        console.log(error);
    }
}
export const logout = (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "logged out successfully."
        })
    } catch (error) {
        console.log(error);
    }
}
export const getOtherUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const currentUserObjectId = new mongoose.Types.ObjectId(loggedInUserId);
        const [otherUsers, latestMessages] = await Promise.all([
            User.find({ _id: { $ne: currentUserObjectId } }).select("-password").lean(),
            Message.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: currentUserObjectId },
                            { receiverId: currentUserObjectId }
                        ]
                    }
                },
                { $sort: { createdAt: -1, _id: -1 } },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$senderId", currentUserObjectId] },
                                "$receiverId",
                                "$senderId"
                            ]
                        },
                        lastMessage: { $first: "$$ROOT" }
                    }
                }
            ])
        ]);
        const latestMessageByUserId = new Map(
            latestMessages.map(({ _id, lastMessage }) => [_id.toString(), lastMessage])
        );
        const usersWithLatestMessages = otherUsers.map((user) => ({
            ...user,
            lastMessage: latestMessageByUserId.get(user._id.toString()) || null
        }));
        return res.status(200).json(usersWithLatestMessages);
    } catch (error) {
        console.log(error);
    }
}

const getPublicUser = (user) => ({
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    profilePhoto: user.profilePhoto || "",
    gender: user.gender || ""
});

export const updateProfile = async (req, res) => {
    let newPhotoPath;
    try {
        const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
        const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
        if (!fullName || fullName.length > 80) {
            return res.status(400).json({ message: "Full name is required and must be 80 characters or fewer." });
        }
        if (!username || username.length > 30) {
            return res.status(400).json({ message: "Username is required and must be 30 characters or fewer." });
        }

        const existingUser = await User.findById(req.id);
        if (!existingUser) return res.status(404).json({ message: "User not found." });

        const usernameTaken = await User.exists({
            username,
            _id: { $ne: existingUser._id }
        });
        if (usernameTaken) {
            return res.status(409).json({ message: "That username is already in use." });
        }

        if (req.file) {
            newPhotoPath = await storeUploadedImage(req.file);
        }
        const previousPhoto = existingUser.profilePhoto;
        existingUser.fullName = fullName;
        existingUser.username = username;
        if (newPhotoPath) existingUser.profilePhoto = newPhotoPath;
        await existingUser.save();

        const savedPhotoPath = newPhotoPath;
        newPhotoPath = null;
        if (savedPhotoPath && previousPhoto && previousPhoto !== savedPhotoPath) {
            try {
                await deleteUploadedImage(previousPhoto);
            } catch (cleanupError) {
                console.error("Unable to remove the previous profile image:", cleanupError);
            }
        }
        const profile = getPublicUser(existingUser);
        emitToAllUsers("profileUpdated", profile);
        return res.status(200).json({ user: profile });
    } catch (error) {
        if (newPhotoPath) {
            try {
                await deleteUploadedImage(newPhotoPath);
            } catch (cleanupError) {
                console.error("Unable to remove an unreferenced profile image:", cleanupError);
            }
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: "That username is already in use." });
        }
        console.error("Failed to update profile:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Unable to update profile."
        });
    }
};

export const removeProfilePhoto = async (req, res) => {
    try {
        const user = await User.findById(req.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        const previousPhoto = user.profilePhoto;
        user.profilePhoto = "";
        await user.save();

        try {
            await deleteUploadedImage(previousPhoto);
        } catch (error) {
            console.error("Unable to remove the previous profile image:", error);
        }

        const profile = getPublicUser(user);
        emitToAllUsers("profileUpdated", profile);
        return res.status(200).json({ user: profile });
    } catch (error) {
        console.error("Failed to remove profile photo:", error);
        return res.status(500).json({ message: "Unable to remove profile photo." });
    }
};