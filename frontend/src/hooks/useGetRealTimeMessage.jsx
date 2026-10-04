import { useEffect } from "react";
import {useSelector, useDispatch} from "react-redux";
import { appendMessage } from "../redux/messageSlice";
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

        socket.on("newMessage", handleNewMessage);
        return () => socket.off("newMessage", handleNewMessage);
    }, [socket, authUser?._id, selectedUser?._id, dispatch]);
};
export default useGetRealTimeMessage;