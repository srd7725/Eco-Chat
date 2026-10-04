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
            if (state.messages.some((existingMessage) => String(existingMessage._id) === String(message._id))) {
                return;
            }
            state.messages.push(message);
            sortMessages(state.messages);
        },
        updateMessageReaction:(state, action)=>{
            const { messageId, message } = action.payload || {};
            if (!state.messages || !messageId || !message) return;

            const existingMessageIndex = state.messages.findIndex(
                (existingMessage) => String(existingMessage._id) === String(messageId)
            );

            if (existingMessageIndex >= 0) {
                state.messages[existingMessageIndex] = {
                    ...state.messages[existingMessageIndex],
                    ...message,
                    reactions: message.reactions || state.messages[existingMessageIndex].reactions || []
                };
            } else {
                state.messages.push(message);
            }

            sortMessages(state.messages);
        }
    }
});
export const {setMessages,mergeMessages,appendMessage,updateMessageReaction} = messageSlice.actions;
export default messageSlice.reducer;