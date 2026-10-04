import { User } from "../models/userModel.js";
import mongoose from "mongoose";
import { Message } from "../models/messageModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender } = req.body;
        if (!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password do not match" });
        }

        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "Username already exit try different" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const profilePhoto = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

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
            profilePhoto: user.profilePhoto
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