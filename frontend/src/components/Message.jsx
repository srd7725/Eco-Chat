import React, { useEffect, useRef } from 'react'
import {useSelector} from "react-redux";
import ProfileAvatar from './ProfileAvatar';

const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
    return `${date.toLocaleDateString()}, ${time}`;
};

const Message = ({message}) => {
    const scroll = useRef();
    const {authUser,selectedUser} = useSelector(store=>store.user);

    useEffect(()=>{
        scroll.current?.scrollIntoView({behavior:"smooth"});
    },[message]);
    
    return (
        <div ref={scroll} className={`chat ${message?.senderId === authUser?._id ? 'chat-end' : 'chat-start'}`}>
            <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                    <ProfileAvatar user={message?.senderId === authUser?._id ? authUser : selectedUser} />
                </div>
            </div>
            <div className={`chat-bubble ${message?.senderId !== authUser?._id ? 'bg-gray-200 text-black' : ''}`}>
                <p className='whitespace-pre-wrap break-words'>{message?.message}</p>
                <time dateTime={message?.createdAt} className='mt-1 block text-right text-[10px] leading-tight opacity-60'>
                    {formatMessageTime(message?.createdAt)}
                </time>
            </div>
        </div>
    )
}

export default Message