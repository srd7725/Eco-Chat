import {createSlice} from "@reduxjs/toolkit";

const sortMessages = (messages) => messages.sort((first, second) => {
    const timeDifference = new Date(first.createdAt) - new Date(second.createdAt);
    return timeDifference || String(first._id).localeCompare(String(second._id));
});

const messageSlice = createSlice({
    name:"message",
    initialState:{
        messages:null,
    },
    reducers:{
        setMessages:(state,action)=>{
            state.messages = action.payload;
        },
        mergeMessages:(state, action)=>{
            const messagesById = new Map(
                (state.messages || []).map((message) => [String(message._id), message])
            );
            action.payload?.forEach((message) => {
                messagesById.set(String(message._id), message);
            });
            state.messages = sortMessages(Array.from(messagesById.values()));
        },
        appendMessage:(state, action)=>{
            const message = action.payload;
            if (!state.messages) {
                state.messages = [message];
                return;
            }
            if (state.messages.some((existingMessage) => existingMessage._id === message._id)) {
                return;
            }
            state.messages.push(message);
            sortMessages(state.messages);
        }
    }
});
export const {setMessages,mergeMessages,appendMessage} = messageSlice.actions;
export default messageSlice.reducer;