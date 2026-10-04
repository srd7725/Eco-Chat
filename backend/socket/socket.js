import {Server} from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors:{
        origin:['http://localhost:3000'],
        credentials: true,
        methods:['GET', 'POST'],
    },
});

io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const tokenCookie = cookieHeader.split(";").map((entry) => entry.trim())
        .find((entry) => entry.startsWith("token="));
    if (!tokenCookie) return next(new Error("Authentication required."));

    try {
        const token = decodeURIComponent(tokenCookie.slice("token=".length));
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
        socket.data.userId = String(payload.userId);
        return next();
    } catch {
        return next(new Error("Invalid authentication token."));
    }
});

const userSocketMap = new Map();

export const emitToUser = (userId, event, payload) => {
    const sockets = userSocketMap.get(String(userId));
    if (!sockets) return;
    sockets.forEach((socketId) => io.to(socketId).emit(event, payload));
};

export const emitToAllUsers = (event, payload) => {
    io.emit(event, payload);
};

const emitOnlineUsers = () => {
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
};

io.on('connection', (socket)=>{
    const userId = socket.data.userId;
    const sockets = userSocketMap.get(userId) || new Set();
    sockets.add(socket.id);
    userSocketMap.set(userId, sockets);
    emitOnlineUsers();

    socket.on('disconnect', ()=>{
        const activeSockets = userSocketMap.get(userId);
        activeSockets?.delete(socket.id);
        if (activeSockets?.size === 0) userSocketMap.delete(userId);
        emitOnlineUsers();
    })

})

export {app, io, server};
