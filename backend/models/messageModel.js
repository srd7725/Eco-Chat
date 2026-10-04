import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    emoji:{
        type:String,
        required:true,
        trim:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
}, { _id: false });

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
        default:"",
        trim:true
    },
    messageType:{
        type:String,
        enum:["text", "image", "file"],
        default:"text"
    },
    fileUrl:{
        type:String,
        default:""
    },
    fileName:{
        type:String,
        default:""
    },
    fileSize:{
        type:Number,
        default:0
    },
    mimeType:{
        type:String,
        default:""
    },
    deletedFor:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:[]
    }],
    deletedForEveryone:{
        type:Boolean,
        default:false
    },
    deletedAt:{
        type:Date,
        default:null
    },
    reactions:[reactionSchema]
},{timestamps:true});
messageModel.index({ senderId: 1, createdAt: -1, _id: -1 });
messageModel.index({ receiverId: 1, createdAt: -1, _id: -1 });
export const Message = mongoose.model("Message", messageModel);