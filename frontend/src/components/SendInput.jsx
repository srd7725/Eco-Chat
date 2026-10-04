import React, { useRef, useState } from 'react'
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import { MdAttachFile } from "react-icons/md";
import axios from "axios";
import EmojiPicker from 'emoji-picker-react';
import {useDispatch,useSelector} from "react-redux";
import { appendMessage } from '../redux/messageSlice';
import { updateConversationLastMessage } from '../redux/userSlice';
import { BASE_URL } from '..';

const formatFileSize = (bytes = 0) => {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const SendInput = () => {
    const [message, setMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState(null);
    const fileInputRef = useRef(null);
    const dispatch = useDispatch();
    const {selectedUser, authUser} = useSelector(store=>store.user);

    const resetComposer = () => {
        setMessage("");
        setPendingAttachment(null);
        setShowEmojiPicker(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!selectedUser?._id) return;
        if (!trimmedMessage && !pendingAttachment) return;

        try {
            const formData = new FormData();
            if (trimmedMessage) formData.append('message', trimmedMessage);
            if (pendingAttachment?.file) formData.append('file', pendingAttachment.file);

            const config = {
                withCredentials: true,
                headers: pendingAttachment ? undefined : { 'Content-Type': 'application/json' }
            };

            const res = pendingAttachment
                ? await axios.post(`${BASE_URL}/api/v1/message/send/${selectedUser?._id}`, formData, config)
                : await axios.post(`${BASE_URL}/api/v1/message/send/${selectedUser?._id}`, { message: trimmedMessage }, config);

            const newMessage = res?.data?.newMessage;
            if (newMessage) {
                dispatch(appendMessage(newMessage));
                dispatch(updateConversationLastMessage({
                    message: newMessage,
                    currentUserId: authUser?._id
                }));
            }
        } catch (error) {
            console.log(error);
        }

        resetComposer();
    };

    const handleEmojiSelect = (emojiData) => {
        setMessage((previousMessage) => `${previousMessage}${emojiData.emoji}`);
        setShowEmojiPicker(false);
    };

    const handleAttachmentSelection = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const allowedDocumentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.ps1', '.vbs'];
        const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

        if (dangerousExtensions.includes(extension)) {
            event.target.value = '';
            return;
        }

        const isImage = allowedImageTypes.includes(file.type);
        const isDocument = allowedDocumentTypes.includes(file.type) || ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'].includes(extension);
        if (!isImage && !isDocument) {
            event.target.value = '';
            return;
        }

        const previewUrl = isImage ? URL.createObjectURL(file) : '';
        setPendingAttachment({ file, previewUrl, isImage, name: file.name, size: file.size });
        event.target.value = '';
    };

    return (
        <form onSubmit={onSubmitHandler} className='px-4 pb-3 pt-2'>
            {pendingAttachment && (
                <div className='mb-3 rounded-lg border border-zinc-600 bg-zinc-800 p-3 text-white'>
                    {pendingAttachment.isImage ? (
                        <div className='mb-2 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900'>
                            <img src={pendingAttachment.previewUrl} alt='Selected attachment preview' className='max-h-32 w-full object-contain' />
                        </div>
                    ) : (
                        <div className='mb-2 flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 p-2'>
                            <div className='text-xl'>📄</div>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-medium'>{pendingAttachment.name}</p>
                                <p className='text-xs text-zinc-300'>{formatFileSize(pendingAttachment.size)}</p>
                            </div>
                        </div>
                    )}
                    <div className='flex justify-end gap-2'>
                        <button type='button' onClick={() => setPendingAttachment(null)} className='rounded-md border border-zinc-600 px-3 py-1 text-sm hover:bg-zinc-700'>Remove</button>
                        <button type='submit' className='rounded-md bg-blue-500 px-3 py-1 text-sm font-medium hover:bg-blue-400'>Send</button>
                    </div>
                </div>
            )}
            <div className='w-full relative'>
                <div className='absolute inset-y-0 start-0 flex items-center gap-2 pl-3 z-10'>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className='text-lg text-blue-300 hover:text-blue-200 transition-colors'
                        aria-label='Add attachment'
                    >
                        <MdAttachFile />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker((open) => !open)}
                        className='text-lg text-yellow-300 hover:text-yellow-200 transition-colors'
                        aria-label='Open emoji picker'
                    >
                        <BsEmojiSmile />
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt'
                    onChange={handleAttachmentSelection}
                    className='hidden'
                />
                {showEmojiPicker && (
                    <div className='absolute bottom-14 left-0 z-20 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl'>
                        <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            width={320}
                            height={280}
                            previewConfig={{ showPreview: false }}
                            searchDisabled={false}
                            skinTonesDisabled={false}
                        />
                    </div>
                )}
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder='Send a message...'
                    className='border text-sm rounded-lg block w-full p-3 pl-20 pr-11 border-zinc-500 bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button type="submit" className='absolute flex inset-y-0 end-0 items-center pr-4 text-lg text-white hover:text-blue-300'>
                    <IoSend />
                </button>
            </div>
        </form>
    )
}

export default SendInput