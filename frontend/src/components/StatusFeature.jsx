import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '..';
import ProfileAvatar, { resolveImageUrl } from './ProfileAvatar';
import fallbackAvatar from '../assets/avatar-fallback.svg';
import {
    addStatus,
    mergeStatuses,
    removeStatus,
    setStatusViewers,
    setStatuses,
    updateStatusView
} from '../redux/statusSlice';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const getUserId = (user) => String(user?._id || user || '');

const formatStatusTime = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

const StatusFeature = () => {
    const { authUser } = useSelector((store) => store.user);
    const { socket } = useSelector((store) => store.socket);
    const statuses = useSelector((store) => store.status.statuses);
    const activeStatuses = useMemo(
        () => statuses.filter((status) => new Date(status.expiresAt).getTime() > Date.now()),
        [statuses]
    );
    const dispatch = useDispatch();
    const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [viewingIndex, setViewingIndex] = useState(0);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [isViewerListOpen, setIsViewerListOpen] = useState(false);

    useEffect(() => {
        let isCurrent = true;
        const fetchStatuses = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/api/v1/status`, {
                    withCredentials: true
                });
                if (isCurrent) {
                    dispatch(mergeStatuses(response.data));
                }
            } catch (error) {
                console.error('Unable to fetch statuses:', error);
            }
        };
        fetchStatuses();
        const refreshTimer = window.setInterval(fetchStatuses, 60_000);
        return () => {
            isCurrent = false;
            window.clearInterval(refreshTimer);
        };
    }, [dispatch]);

    useEffect(() => {
        if (!socket) return undefined;
        const handleNewStatus = (status) => dispatch(addStatus(status));
        const handleStatusViewed = (event) => dispatch(updateStatusView(event));
        const handleStatusDeleted = ({ statusId }) => {
            dispatch(removeStatus(statusId));
            setViewing((currentViewing) => {
                if (!currentViewing) return currentViewing;
                const remaining = currentViewing.statuses.filter((status) => status._id !== statusId);
                return remaining.length ? { ...currentViewing, statuses: remaining } : null;
            });
        };
        socket.on('newStatus', handleNewStatus);
        socket.on('statusViewed', handleStatusViewed);
        socket.on('statusDeleted', handleStatusDeleted);
        return () => {
            socket.off('newStatus', handleNewStatus);
            socket.off('statusViewed', handleStatusViewed);
            socket.off('statusDeleted', handleStatusDeleted);
        };
    }, [socket, dispatch]);

    useEffect(() => {
        const expireStatuses = () => {
            const now = Date.now();
            dispatch(setStatuses(statuses.filter(
                (status) => new Date(status.expiresAt).getTime() > now
            )));
            setViewing((currentViewing) => {
                if (!currentViewing) return currentViewing;
                const activeStatuses = currentViewing.statuses.filter(
                    (status) => new Date(status.expiresAt).getTime() > now
                );
                return activeStatuses.length
                    ? { ...currentViewing, statuses: activeStatuses }
                    : null;
            });
        };
        const timerId = window.setInterval(expireStatuses, 60_000);
        return () => window.clearInterval(timerId);
    }, [dispatch, statuses]);

    useEffect(() => {
        if (!imageFile) {
            setImagePreviewUrl('');
            return undefined;
        }
        const preview = URL.createObjectURL(imageFile);
        setImagePreviewUrl(preview);
        return () => URL.revokeObjectURL(preview);
    }, [imageFile]);

    useEffect(() => {
        if (viewing && viewingIndex >= viewing.statuses.length) {
            setViewingIndex(Math.max(0, viewing.statuses.length - 1));
        }
    }, [viewing, viewingIndex]);

    const groupedStatuses = useMemo(() => {
        const groups = new Map();
        activeStatuses.forEach((status) => {
            const owner = status.userId;
            const ownerId = getUserId(owner);
            if (!ownerId) return;
            if (!groups.has(ownerId)) {
                groups.set(ownerId, { user: owner, statuses: [] });
            }
            groups.get(ownerId).statuses.push(status);
        });
        return Array.from(groups.values()).map((group) => ({
            ...group,
            statuses: group.statuses.sort((first, second) =>
                new Date(first.createdAt) - new Date(second.createdAt)
            )
        }));
    }, [activeStatuses]);

    const ownStatusGroup = groupedStatuses.find(
        (group) => getUserId(group.user) === getUserId(authUser)
    );
    const contactStatusGroups = groupedStatuses
        .filter((group) => getUserId(group.user) !== getUserId(authUser))
        .sort((first, second) => {
            const firstNewest = first.statuses[first.statuses.length - 1];
            const secondNewest = second.statuses[second.statuses.length - 1];
            return new Date(secondNewest.createdAt) - new Date(firstNewest.createdAt);
        });

    const openStatus = (group) => {
        setViewing(group);
        setViewingIndex(0);
        setIsViewerListOpen(false);
    };

    const currentStatusId = viewing?.statuses[viewingIndex]?._id;
    const currentStatus = activeStatuses.find((status) => status._id === currentStatusId) || null;
    const isViewingOwnStatus = getUserId(viewing?.user) === getUserId(authUser);

    useEffect(() => {
        if (!currentStatus || isViewingOwnStatus) return undefined;
        let isCurrent = true;
        axios.post(`${BASE_URL}/api/v1/status/${currentStatus._id}/view`, {}, {
            withCredentials: true
        }).catch((error) => {
            if (isCurrent) {
                console.error('Unable to record status view:', error);
                toast.error(error.response?.data?.message || 'Unable to view this status.');
                setViewing(null);
            }
        });
        return () => {
            isCurrent = false;
        };
    }, [currentStatus?._id, isViewingOwnStatus]);

    const submitStatus = async (event) => {
        event.preventDefault();
        const trimmedText = text.trim();
        if (!trimmedText && !imageFile) {
            toast.error('Add text or choose an image for your status.');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('text', trimmedText);
            if (imageFile) formData.append('image', imageFile);
            const response = await axios.post(
                `${BASE_URL}/api/v1/status`,
                formData,
                { withCredentials: true }
            );
            dispatch(addStatus(response.data.status));
            setText('');
            setImageFile(null);
            setIsComposerOpen(false);
            toast.success('Status posted.');
        } catch (error) {
            console.error('Unable to create status:', error);
            toast.error(error.response?.data?.message || error.message || 'Unable to post status.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteViewedStatus = async () => {
        const status = viewing?.statuses[viewingIndex];
        if (!status) return;
        try {
            await axios.delete(`${BASE_URL}/api/v1/status/${status._id}`, {
                withCredentials: true
            });
            dispatch(removeStatus(status._id));
            const remainingInGroup = viewing.statuses.filter((item) => item._id !== status._id);
            if (!remainingInGroup.length) {
                setViewing(null);
            } else {
                setViewing({ ...viewing, statuses: remainingInGroup });
                setViewingIndex(Math.min(viewingIndex, remainingInGroup.length - 1));
            }
            toast.success('Status deleted.');
        } catch (error) {
            console.error('Unable to delete status:', error);
            toast.error(error.response?.data?.message || 'Unable to delete status.');
        }
    };

    const showViewers = async () => {
        if (!currentStatus || !isViewingOwnStatus) return;
        try {
            const response = await axios.get(
                `${BASE_URL}/api/v1/status/${currentStatus._id}/viewers`,
                { withCredentials: true }
            );
            dispatch(setStatusViewers({
                statusId: currentStatus._id,
                viewers: response.data.viewers,
                viewCount: response.data.viewCount
            }));
            setIsViewerListOpen(true);
        } catch (error) {
            console.error('Unable to load status viewers:', error);
            toast.error(error.response?.data?.message || 'Unable to load viewers.');
        }
    };

    return (
        <section className='mb-3 text-white'>
            {!isStatusPanelOpen ? (
                <button
                    type='button'
                    onClick={() => setIsStatusPanelOpen(true)}
                    className='flex w-full items-center justify-center rounded-md border border-white/15 bg-slate-800/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700/80'
                >
                    Status
                </button>
            ) : (
                <div className='rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-lg'>
                    <div className='mb-3 flex items-center gap-2'>
                        <button
                            type='button'
                            onClick={() => setIsStatusPanelOpen(false)}
                            className='rounded px-2 py-1 text-base hover:bg-white/10'
                            aria-label='Back to conversations'
                        >
                            ←
                        </button>
                        <span className='text-sm font-semibold'>Status</span>
                    </div>

                    <div className='space-y-4'>
                        <div className='rounded-lg border border-white/10 bg-white/5 p-2'>
                            <p className='mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300'>My Status</p>
                            <button
                                type='button'
                                onClick={() => ownStatusGroup ? openStatus(ownStatusGroup) : setIsComposerOpen(true)}
                                className='flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/10'
                            >
                                <div className='avatar'>
                                    <div className={`w-12 rounded-full ${ownStatusGroup ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-900' : ''}`}>
                                        <ProfileAvatar user={authUser} alt='My profile' />
                                    </div>
                                </div>
                                <span className='min-w-0 flex-1'>
                                    <span className='block truncate text-sm font-medium'>My Status</span>
                                    <span className='block truncate text-xs opacity-65'>
                                        {ownStatusGroup
                                            ? `${formatStatusTime(ownStatusGroup.statuses[ownStatusGroup.statuses.length - 1].createdAt)} • Views: ${ownStatusGroup.statuses[ownStatusGroup.statuses.length - 1].viewCount || 0}`
                                            : 'Tap to add a status'}
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div>
                            <p className='mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300'>Recent Updates</p>
                            <div className='space-y-1'>
                                {contactStatusGroups.map((group) => {
                                    const latestStatus = group.statuses[group.statuses.length - 1];
                                    return (
                                        <button
                                            key={getUserId(group.user)}
                                            type='button'
                                            onClick={() => openStatus(group)}
                                            className='flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/10'
                                        >
                                            <div className='avatar'>
                                                <div className='w-11 rounded-full ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-900'>
                                                    <ProfileAvatar user={group.user} alt={`${group.user.fullName} profile`} />
                                                </div>
                                            </div>
                                            <span className='min-w-0 flex-1'>
                                                <span className='block truncate text-sm font-medium'>{group.user.fullName}</span>
                                                <span className='block truncate text-xs opacity-65'>{formatStatusTime(latestStatus.createdAt)}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isComposerOpen && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'>
                    <form onSubmit={submitStatus} className='w-full max-w-sm rounded-lg border border-white/20 bg-zinc-900 p-5 text-white shadow-xl'>
                        <h3 className='mb-3 text-lg font-semibold'>Add Status</h3>
                        <textarea
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            maxLength={700}
                            rows={4}
                            placeholder='Share a status...'
                            className='w-full rounded-md border border-white/20 bg-zinc-800 p-3 text-sm placeholder:text-white/50 focus:border-white/50 focus:outline-none'
                        />
                        {text.trim() && (
                            <div className='mt-3 rounded-md border border-white/10 bg-black/20 p-3'>
                                <p className='mb-1 text-xs opacity-60'>Preview</p>
                                <p className='whitespace-pre-wrap break-words text-sm'>{text.trim()}</p>
                            </div>
                        )}
                        <label className='mt-3 block text-sm'>
                            <span className='mb-1 block opacity-75'>Image (optional, max 4 MB)</span>
                            <input
                                type='file'
                                accept='image/png,image/jpeg,image/webp'
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                                        toast.error('Choose a JPG, PNG, or WebP image.');
                                        event.target.value = '';
                                        return;
                                    }
                                    if (file.size > MAX_IMAGE_SIZE) {
                                        toast.error('Choose an image smaller than 4 MB.');
                                        event.target.value = '';
                                        return;
                                    }
                                    setImageFile(file);
                                }}
                                className='block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-white'
                            />
                        </label>
                        {imagePreviewUrl && (
                            <img
                                src={imagePreviewUrl}
                                alt='Status preview'
                                className='mt-3 max-h-48 w-full rounded-md bg-black object-contain'
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = fallbackAvatar;
                                }}
                            />
                        )}
                        {imageFile && <p className='mt-2 truncate text-xs opacity-70'>{imageFile.name}</p>}
                        <div className='mt-4 flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={() => {
                                    setIsComposerOpen(false);
                                    setText('');
                                    setImageFile(null);
                                }}
                                className='rounded-md px-3 py-2 text-sm hover:bg-white/10'
                            >
                                Cancel
                            </button>
                            <button disabled={isSubmitting} type='submit' className='rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50'>
                                {isSubmitting ? 'Posting...' : 'Post Status'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewing && currentStatus && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
                    <div className='flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-white/20 bg-zinc-900 text-white shadow-2xl'>
                        <div className='flex items-center gap-3 p-3'>
                            <div className='avatar'>
                                <div className='w-10 rounded-full'>
                                    <ProfileAvatar user={viewing.user} alt={`${viewing.user.fullName} profile`} />
                                </div>
                            </div>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-medium'>{viewing.user.fullName}</p>
                                <time className='block text-xs opacity-65'>{formatStatusTime(currentStatus.createdAt)}</time>
                            </div>
                            {isViewingOwnStatus && (
                                <button type='button' onClick={deleteViewedStatus} className='rounded px-2 py-1 text-xs text-red-300 hover:bg-white/10'>
                                    Delete
                                </button>
                            )}
                            <button type='button' onClick={() => { setViewing(null); setIsViewerListOpen(false); }} aria-label='Close status' className='rounded px-2 py-1 hover:bg-white/10'>
                                ✕
                            </button>
                        </div>
                        {currentStatus.image && (
                            <img
                                crossOrigin='use-credentials'
                                src={resolveImageUrl(currentStatus.image)}
                                alt='Status'
                                className='max-h-[65vh] w-full bg-black object-contain'
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = fallbackAvatar;
                                }}
                            />
                        )}
                        {currentStatus.text && <p className='whitespace-pre-wrap break-words p-4 text-center'>{currentStatus.text}</p>}
                        {isViewingOwnStatus && (
                            <button
                                type='button'
                                onClick={showViewers}
                                className='border-t border-white/10 px-4 py-3 text-left text-sm hover:bg-white/5'
                            >
                                Views: {currentStatus.viewCount || 0} · View viewers
                            </button>
                        )}
                        {viewing.statuses.length > 1 && (
                            <div className='flex justify-between border-t border-white/10 p-3'>
                                <button
                                    type='button'
                                    disabled={viewingIndex === 0}
                                    onClick={() => setViewingIndex((index) => index - 1)}
                                    className='rounded px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40'
                                >
                                    Previous
                                </button>
                                <span className='self-center text-xs opacity-65'>{viewingIndex + 1} / {viewing.statuses.length}</span>
                                <button
                                    type='button'
                                    disabled={viewingIndex >= viewing.statuses.length - 1}
                                    onClick={() => setViewingIndex((index) => index + 1)}
                                    className='rounded px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40'
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isViewerListOpen && currentStatus && (
                <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4'>
                    <section className='w-full max-w-sm overflow-hidden rounded-lg border border-white/20 bg-zinc-900 text-white shadow-2xl'>
                        <header className='flex items-center justify-between border-b border-white/10 p-4'>
                            <h3 className='font-semibold'>Viewed by {currentStatus.viewCount || 0}</h3>
                            <button type='button' onClick={() => setIsViewerListOpen(false)} aria-label='Close viewers' className='rounded px-2 py-1 hover:bg-white/10'>✕</button>
                        </header>
                        <div className='max-h-80 overflow-y-auto p-2'>
                            {(currentStatus.viewers || []).map((view) => (
                                <div key={String(view.userId?._id || view.userId)} className='flex items-center gap-3 rounded-md p-2'>
                                    <div className='avatar'>
                                        <div className='w-10 rounded-full'>
                                            <ProfileAvatar user={view.userId} alt={`${view.userId?.fullName || 'Viewer'} profile`} />
                                        </div>
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-medium'>{view.userId?.fullName}</p>
                                        <time className='text-xs opacity-65'>{formatStatusTime(view.viewedAt)}</time>
                                    </div>
                                </div>
                            ))}
                            {!currentStatus.viewers?.length && (
                                <p className='p-4 text-center text-sm opacity-65'>No views yet.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
};

export default StatusFeature;
