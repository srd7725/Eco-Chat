import {createSlice} from "@reduxjs/toolkit";

const getId = (id) => String(id?._id || id || "");
const getMessageTime = (user) => user.lastMessage?.createdAt
    ? new Date(user.lastMessage.createdAt).getTime()
    : 0;
const sortByLatestMessage = (users) => users.sort((first, second) => {
    const timeDifference = getMessageTime(second) - getMessageTime(first);
    if (timeDifference) return timeDifference;
    return String(second.lastMessage?._id || '').localeCompare(String(first.lastMessage?._id || ''));
});

const userSlice = createSlice({
    name:"user",
    initialState:{
        authUser:null,
        otherUsers:null,
        selectedUser:null,
        onlineUsers:null,
    },
    reducers:{
        setAuthUser:(state,action)=>{
            state.authUser = action.payload;
        },
        setOtherUsers:(state, action)=>{
            if (!action.payload) {
                state.otherUsers = action.payload;
                return;
            }
            const existingUsersById = new Map(
                (state.otherUsers || []).map((user) => [getId(user._id), user])
            );
            state.otherUsers = sortByLatestMessage(action.payload.map((user) => {
                const existingUser = existingUsersById.get(getId(user._id));
                return existingUser && getMessageTime(existingUser) > getMessageTime(user)
                    ? { ...user, lastMessage: existingUser.lastMessage }
                    : user;
            }));
        },
        updateConversationLastMessage:(state, action)=>{
            if (!state.otherUsers) return;
            const { message, currentUserId } = action.payload;
            const currentUser = getId(currentUserId);
            const sender = getId(message.senderId);
            const receiver = getId(message.receiverId);
            const otherUserId = sender === currentUser ? receiver : sender;
            const user = state.otherUsers.find((otherUser) => getId(otherUser._id) === otherUserId);
            if (!user) return;

            const currentTime = getMessageTime(user);
            const newTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
            if (user.lastMessage && (
                newTime < currentTime ||
                (newTime === currentTime && String(message._id) < String(user.lastMessage._id))
            )) return;

            user.lastMessage = message;
            sortByLatestMessage(state.otherUsers);
        },
        updateUserProfile:(state, action)=>{
            const updatedUser = action.payload;
            const updatedId = getId(updatedUser._id);
            const mergeProfile = (user) => {
                if (user && getId(user._id) === updatedId) {
                    Object.assign(user, updatedUser);
                }
            };
            mergeProfile(state.authUser);
            mergeProfile(state.selectedUser);
            state.otherUsers?.forEach(mergeProfile);
        },
        setSelectedUser:(state,action)=>{
            state.selectedUser = action.payload;
        },
        setOnlineUsers:(state,action)=>{
            state.onlineUsers = action.payload;
        }
    }
});
export const {
    setAuthUser,
    setOtherUsers,
    updateConversationLastMessage,
    updateUserProfile,
    setSelectedUser,
    setOnlineUsers
} = userSlice.actions;
export default userSlice.reducer;