import React, { useEffect, useMemo, useRef, useState } from 'react'
import {useDispatch, useSelector} from "react-redux";
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { resolveImageUrl } from './ProfileAvatar';
import { updateMessageReaction } from '../redux/messageSlice';
import { updateConversationLastMessage } from '../redux/userSlice';
import { BASE_URL } from '..';

const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase();
};

const getUserId = (user) => String(user?._id || user || '');

const buildReactionSummary = (reactions = []) => {
    const countByEmoji = new Map();

    reactions.forEach((reaction) => {
        const emoji = reaction?.emoji;
        if (!emoji) return;

        const existing = countByEmoji.get(emoji) || { emoji, count: 0 };
        existing.count += 1;
        countByEmoji.set(emoji, existing);
    });

    return Array.from(countByEmoji.values()).sort((first, second) => {
        if (second.count !== first.count) return second.count - first.count;
        return first.emoji.localeCompare(second.emoji);
    });
};

const formatFileSize = (bytes = 0) => {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const Message = ({message}) => {
    const scroll = useRef();
    const interactionRef = useRef(null);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showInteractionMenu, setShowInteractionMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const dispatch = useDispatch();
    const {authUser} = useSelector((store) => store.user);
    const reactionSummary = useMemo(() => buildReactionSummary(message?.reactions || []), [message?.reactions]);

    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: 'smooth' });
    }, [message]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (interactionRef.current && !interactionRef.current.contains(event.target)) {
                setShowInteractionMenu(false);
                setShowReactionPicker(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const handleReactionSelection = async (emoji) => {
        if (!message?._id || !authUser?._id) return;

        const myReaction = (message?.reactions || []).find(
            (reaction) => getUserId(reaction.userId) === getUserId(authUser._id) && reaction.emoji === emoji
        );

        try {
            const response = myReaction
                ? await axios.delete(`${BASE_URL}/api/v1/message/reaction/${message._id}`, {
                    data: { emoji },
                    withCredentials: true
                })
                : await axios.post(`${BASE_URL}/api/v1/message/reaction/${message._id}`, { emoji }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });

            const updatedMessage = response?.data?.message;
            if (updatedMessage) {
                dispatch(updateMessageReaction({ messageId: message._id, message: updatedMessage }));
            }
        } catch (error) {
            console.log(error);
        }

        setShowReactionPicker(false);
    };

    const deleteMessage = async (scope) => {
        if (!message?._id || !authUser?._id) return;

        try {
            const endpoint = scope === 'everyone'
                ? `${BASE_URL}/api/v1/message/${message._id}/everyone`
                : `${BASE_URL}/api/v1/message/${message._id}/me`;

            const response = await axios.delete(endpoint, { withCredentials: true });
            const updatedMessage = response?.data?.message;
            if (updatedMessage) {
                dispatch(updateMessageReaction({ messageId: message._id, message: updatedMessage }));
                dispatch(updateConversationLastMessage({
                    message: updatedMessage,
                    currentUserId: authUser?._id
                }));
            }
            setShowDeleteModal(false);
            setShowInteractionMenu(false);
        } catch (error) {
            console.log(error);
        }
    };

    const handleMessageDoubleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setShowInteractionMenu((open) => !open);
        setShowReactionPicker(false);
    };

    const getMessageSenderId = (item) => String(
        item?.senderId ?? item?.sender ?? item?.from ?? item?.userId ?? ''
    );
    const isOwnMessage = getMessageSenderId(message) === String(authUser?._id || '');
    const attachmentUrl = message?.fileUrl ? resolveImageUrl(message.fileUrl) : '';
    const isDeletedForEveryone = Boolean(message?.deletedForEveryone);
    const isDeletedForMe = (message?.deletedFor || []).some(
        (userId) => String(userId) === String(authUser?._id || '')
    );

    if (isDeletedForMe && !isDeletedForEveryone) {
        return null;
    }

    return (
        <div ref={scroll} className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div ref={interactionRef} className='relative flex max-w-[78%] items-end'>
                <div className={`flex min-w-0 max-w-full flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div
                        onDoubleClick={handleMessageDoubleClick}
                        className={`w-fit max-w-full rounded-lg px-2.5 py-1 shadow-sm ${
                            isDeletedForEveryone
                                ? 'bg-zinc-700/80 text-zinc-200 italic'
                                : isOwnMessage
                                    ? 'bg-gradient-to-br from-emerald-800 to-emerald-950 text-white'
                                    : 'bg-zinc-800 text-white'
                        } ${message?.messageType === 'image' || message?.messageType === 'file' ? 'p-2' : ''}`}
                    >
                        {isDeletedForEveryone ? (
                            <p className='whitespace-pre-wrap break-words leading-relaxed'>This message was deleted</p>
                        ) : (
                            <>
                                {message?.messageType === 'image' && attachmentUrl && (
                                    <button
                                        type='button'
                                        onClick={() => window.open(attachmentUrl, '_blank', 'noopener,noreferrer')}
                                        className='mb-1.5 block overflow-hidden rounded-lg border border-white/10 bg-white/5'
                                    >
                                        <img src={attachmentUrl} alt='Sent attachment' className='max-h-64 w-full object-cover' />
                                    </button>
                                )}
                                {message?.messageType === 'file' && attachmentUrl && (
                                    <div className='mb-1.5 rounded-lg border border-white/10 bg-white/5 p-2'>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-xl'>📄</span>
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-xs font-medium'>{message.fileName || 'Document'}</p>
                                                <p className='text-[10px] opacity-70'>{formatFileSize(message.fileSize)}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={attachmentUrl}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='mt-2 inline-block rounded bg-zinc-700 px-2 py-1 text-[10px] text-white hover:bg-zinc-600'
                                        >
                                            Open
                                        </a>
                                    </div>
                                )}
                                {message?.message && message?.messageType !== 'file' && message?.messageType !== 'image' && (
                                    <p className='whitespace-pre-wrap break-words leading-[1.2]'>{message.message}</p>
                                )}
                                {message?.messageType === 'image' && message?.message && message.message !== '📷 Photo' && (
                                    <p className='mt-1 whitespace-pre-wrap break-words leading-[1.2]'>{message.message}</p>
                                )}
                                {message?.messageType === 'file' && message?.message && message.message !== message.fileName && (
                                    <p className='mt-1 whitespace-pre-wrap break-words leading-[1.2]'>{message.message}</p>
                                )}
                            </>
                        )}
                        {!isDeletedForEveryone && (
                            <time
                                dateTime={message?.createdAt}
                                className={`mt-0.5 block text-[10px] leading-none opacity-70 ${isOwnMessage ? 'text-right' : 'text-left'}`}
                            >
                                {formatMessageTime(message?.createdAt)}
                            </time>
                        )}
                    </div>

                    {!isDeletedForEveryone && reactionSummary.length > 0 && (
                        <div className={`mt-1 flex max-w-full flex-wrap gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            {reactionSummary.map(({ emoji, count }) => {
                                const isCurrentUserReaction = (message?.reactions || []).some(
                                    (reaction) => getUserId(reaction.userId) === getUserId(authUser?._id) && reaction.emoji === emoji
                                );

                                return (
                                    <button
                                        key={`${message?._id}-${emoji}`}
                                        type='button'
                                        onClick={() => handleReactionSelection(emoji)}
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                                            isCurrentUserReaction
                                                ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                                                : 'border-slate-300 bg-slate-900/70 text-white'
                                        }`}
                                    >
                                        <span>{emoji}</span>
                                        {count > 1 && <span className='ml-1'>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {!isDeletedForEveryone && showInteractionMenu && (
                        <div className={`absolute ${isOwnMessage ? '-top-12 right-0' : '-top-12 left-0'} z-30 min-w-[170px] rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-2xl`}>
                            <button
                                type='button'
                                onClick={() => {
                                    setShowInteractionMenu(false);
                                    setShowReactionPicker((open) => !open);
                                }}
                                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/10'
                            >
                                <span>😊</span>
                                <span>React</span>
                            </button>
                            <button
                                type='button'
                                onClick={() => {
                                    setShowInteractionMenu(false);
                                    setShowDeleteModal(true);
                                }}
                                className='mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/10'
                            >
                                <span>🗑</span>
                                <span>Delete</span>
                            </button>
                        </div>
                    )}

                    {!isDeletedForEveryone && showReactionPicker && (
                        <div className={`absolute bottom-10 ${isOwnMessage ? 'right-0' : 'left-0'} z-20 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl`}>
                            <EmojiPicker
                                onEmojiClick={(emojiData) => handleReactionSelection(emojiData.emoji)}
                                width={220}
                                height={220}
                                previewConfig={{ showPreview: false }}
                                searchDisabled={false}
                                skinTonesDisabled={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showDeleteModal && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
                    <div className='w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl'>
                        <div className='mb-4 flex items-center justify-between'>
                            <h3 className='text-lg font-semibold'>Delete message</h3>
                            <button
                                type='button'
                                onClick={() => setShowDeleteModal(false)}
                                className='rounded-md px-2 py-1 text-xl text-zinc-300 hover:bg-white/10'
                                aria-label='Close'
                            >
                                ×
                            </button>
                        </div>
                        <p className='mb-4 text-sm text-zinc-300'>What do you want to do?</p>
                        <div className='space-y-2'>
                            <button
                                type='button'
                                onClick={() => deleteMessage('me')}
                                className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm transition hover:bg-white/10'
                            >
                                Delete for me
                            </button>
                            {isOwnMessage && (
                                <button
                                    type='button'
                                    onClick={() => deleteMessage('everyone')}
                                    className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm transition hover:bg-white/10'
                                >
                                    Delete for everyone
                                </button>
                            )}
                            <button
                                type='button'
                                onClick={() => setShowDeleteModal(false)}
                                className='w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-3 text-left text-sm transition hover:bg-zinc-700'
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Message