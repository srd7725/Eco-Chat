import React from 'react'
import Message from './Message'
import useGetMessages from '../hooks/useGetMessages';
import { useSelector } from "react-redux";

const Messages = () => {
    useGetMessages();
    const { messages } = useSelector(store => store.message);
    let previousDateKey = null;

    return (
        <div className='flex flex-1 flex-col gap-1.5 overflow-auto px-4 py-2'>
            {messages && messages.map((message) => {
                const messageDate = message?.createdAt ? new Date(message.createdAt) : null;
                const hasValidDate = messageDate && !Number.isNaN(messageDate.getTime());
                const dateKey = hasValidDate
                    ? `${messageDate.getFullYear()}-${messageDate.getMonth()}-${messageDate.getDate()}`
                    : null;
                const showDateSeparator = dateKey && dateKey !== previousDateKey;
                previousDateKey = dateKey || previousDateKey;

                let dateLabel = '';
                if (showDateSeparator) {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (messageDate.toDateString() === today.toDateString()) {
                        dateLabel = 'Today';
                    } else if (messageDate.toDateString() === yesterday.toDateString()) {
                        dateLabel = 'Yesterday';
                    } else {
                        dateLabel = messageDate.toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                    }
                }

                return (
                    <React.Fragment key={message._id}>
                        {showDateSeparator && (
                            <div className='my-2 flex justify-center'>
                                <span className='rounded-full bg-slate-800/90 px-3 py-1 text-xs text-slate-200 shadow-sm'>
                                    {dateLabel}
                                </span>
                            </div>
                        )}
                        <Message message={message} />
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default Messages