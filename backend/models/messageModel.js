import mongoose from "mongoose";

const messageModel = new mongoose.Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message:{
        type:String,
        required:true
    }
},{timestamps:true});
messageModel.index({ senderId: 1, createdAt: -1, _id: -1 });
messageModel.index({ receiverId: 1, createdAt: -1, _id: -1 });
export const Message = mongoose.model("Message", messageModel);