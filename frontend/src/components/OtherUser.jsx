import React from 'react'
import { useDispatch,useSelector } from "react-redux";
import { setSelectedUser } from '../redux/userSlice';
import ProfileAvatar from './ProfileAvatar';

const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

const OtherUser = ({ user }) => {
    const dispatch = useDispatch();
    const {selectedUser, onlineUsers, authUser} = useSelector(store=>store.user);
    const isOnline = onlineUsers?.includes(user._id);
    const lastMessage = user.lastMessage;
    const isOwnMessage = String(lastMessage?.senderId?._id || lastMessage?.senderId) === String(authUser?._id);
    const selectedUserHandler = (user) => {
        dispatch(setSelectedUser(user));
    }
    return (
        <>
            <div onClick={() => selectedUserHandler(user)} className={` ${selectedUser?._id === user?._id ? 'bg-zinc-200 text-black' : 'text-white'} flex gap-2 hover:text-black items-center hover:bg-zinc-200 rounded p-2 cursor-pointer`}>
                <div className={`avatar ${isOnline ? 'online' : '' }`}>
                    <div className='w-12 rounded-full'>
                        <ProfileAvatar user={user} alt={`${user?.fullName || 'User'} profile`} />
                    </div>
                </div>
                <div className='flex min-w-0 flex-1 flex-col'>
                    <div className='flex min-w-0 items-center justify-between gap-2'>
                        <p className='truncate'>{user?.fullName}</p>
                        {lastMessage && <time className='shrink-0 text-xs opacity-70'>{formatMessageTime(lastMessage.createdAt)}</time>}
                    </div>
                    <p className='truncate text-xs opacity-75'>
                        {lastMessage ? `${isOwnMessage ? 'You: ' : ''}${lastMessage.message}` : ''}
                    </p>
                </div>
            </div>
            <div className='divider my-0 py-0 h-1'></div>
        </>
    )
}

export default OtherUser