import { useEffect } from "react";
import {useSelector, useDispatch} from "react-redux";
import { appendMessage, updateMessageReaction } from "../redux/messageSlice";
import { updateConversationLastMessage } from "../redux/userSlice";

const getId = (id) => String(id?._id || id || "");

const useGetRealTimeMessage = () => {
    const {socket} = useSelector(store=>store.socket);
    const {authUser, selectedUser} = useSelector(store=>store.user);
    const dispatch = useDispatch();
    useEffect(() => {
        if (!socket || !authUser?._id) return undefined;

        const handleNewMessage = (newMessage) => {
            const currentUserId = getId(authUser._id);
            const senderId = getId(newMessage.senderId);
            const receiverId = getId(newMessage.receiverId);
            if (senderId !== currentUserId && receiverId !== currentUserId) return;

            dispatch(updateConversationLastMessage({ message: newMessage, currentUserId }));
            const selectedUserId = getId(selectedUser?._id);
            if (selectedUserId && [senderId, receiverId].includes(selectedUserId)) {
                dispatch(appendMessage(newMessage));
            }
        };

        const handleMessageReaction = ({ messageId, message }) => {
            if (!messageId || !message) return;
            dispatch(updateMessageReaction({ messageId, message }));
        };

        const handleMessageDeleted = ({ messageId, message }) => {
            if (!messageId || !message) return;
            dispatch(updateMessageReaction({ messageId, message }));
            dispatch(updateConversationLastMessage({
                message,
                currentUserId: authUser?._id
            }));
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messageReactionUpdated", handleMessageReaction);
        socket.on("messageDeleted", handleMessageDeleted);
        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messageReactionUpdated", handleMessageReaction);
            socket.off("messageDeleted", handleMessageDeleted);
        };
    }, [socket, authUser?._id, selectedUser?._id, dispatch]);
};
export default useGetRealTimeMessage;