import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '..';
import { updateUserProfile } from '../redux/userSlice';
import ProfileAvatar from './ProfileAvatar';
import fallbackAvatar from '../assets/avatar-fallback.svg';

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SECTIONS = ['Profile', 'Privacy', 'Account'];

const SettingsPanel = ({ onClose, onBack, onLogout }) => {
    const authUser = useSelector((store) => store.user.authUser);
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const panelRef = useRef(null);
    const [section, setSection] = useState('Profile');
    const [fullName, setFullName] = useState(authUser?.fullName || '');
    const [username, setUsername] = useState(authUser?.username || '');
    const [photoFile, setPhotoFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        if (!photoFile) {
            setPreviewUrl('');
            return undefined;
        }
        const objectUrl = URL.createObjectURL(photoFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [photoFile]);

    const choosePhoto = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            toast.error('Choose a JPG, PNG, or WebP image.');
            return;
        }
        if (file.size > MAX_PHOTO_SIZE) {
            toast.error('Choose an image smaller than 4 MB.');
            return;
        }
        setPhotoFile(file);
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        const trimmedFullName = fullName.trim();
        const trimmedUsername = username.trim();
        if (!trimmedFullName || !trimmedUsername) {
            toast.error('Full name and username are required.');
            return;
        }

        const formData = new FormData();
        formData.append('fullName', trimmedFullName);
        formData.append('username', trimmedUsername);
        if (photoFile) formData.append('profilePhoto', photoFile);

        setIsSaving(true);
        try {
            const response = await axios.patch(`${BASE_URL}/api/v1/user/profile`, formData, {
                withCredentials: true
            });
            dispatch(updateUserProfile(response.data.user));
            setFullName(response.data.user.fullName);
            setUsername(response.data.user.username);
            setPhotoFile(null);
            toast.success('Profile updated.');
        } catch (error) {
            console.error('Unable to update profile:', error);
            toast.error(error.response?.data?.message || 'Unable to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const removePhoto = async () => {
        try {
            const response = await axios.delete(`${BASE_URL}/api/v1/user/profile/photo`, {
                withCredentials: true
            });
            dispatch(updateUserProfile(response.data.user));
            setPhotoFile(null);
            toast.success('Profile photo removed.');
        } catch (error) {
            console.error('Unable to remove profile photo:', error);
            toast.error(error.response?.data?.message || 'Unable to remove profile photo.');
        }
    };

    return (
        <section
            ref={panelRef}
            aria-labelledby='settings-heading'
            className='flex h-full w-full flex-col overflow-hidden bg-zinc-900/95 text-white'
        >
            <header className='grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4'>
                <button
                    type='button'
                    onClick={onBack || onClose}
                    className='flex w-fit items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-slate-200 hover:bg-white/10'
                >
                    <span aria-hidden='true'>←</span>
                    <span>Back to Chats</span>
                </button>
                <h2 id='settings-heading' className='text-center text-xl font-semibold'>Settings</h2>
                <button type='button' onClick={onClose} aria-label='Close settings' className='justify-self-end rounded-md px-2 py-1 text-xl leading-none hover:bg-white/10'>
                    ✕
                </button>
            </header>

            <div className='grid min-h-0 flex-1 sm:grid-cols-[180px_1fr]'>
                    <nav aria-label='Settings sections' className='flex gap-2 overflow-x-auto border-b border-white/10 p-3 sm:flex-col sm:border-b-0 sm:border-r'>
                        {SECTIONS.map((item) => (
                            <button
                                key={item}
                                type='button'
                                onClick={() => setSection(item)}
                                className={`shrink-0 rounded-md px-3 py-2 text-left text-sm ${section === item ? 'bg-white/15 font-medium' : 'opacity-75 hover:bg-white/10'}`}
                            >
                                {item}
                            </button>
                        ))}
                        <button type='button' onClick={onLogout} className='rounded-md px-3 py-2 text-left text-sm text-red-200 hover:bg-white/10'>
                            Logout
                        </button>
                    </nav>

                    <div className='overflow-y-auto p-4 sm:p-5'>
                        {section === 'Profile' && (
                            <form onSubmit={saveProfile} className='mx-auto max-w-md space-y-4'>
                                <div className='flex flex-col items-center gap-3 pb-2'>
                                    <div className='avatar'>
                                        <div className='h-24 w-24 rounded-full ring-2 ring-white/20'>
                                            {previewUrl
                                                ? <img
                                                    src={previewUrl}
                                                    alt='Profile photo preview'
                                                    onError={(event) => {
                                                        event.currentTarget.onerror = null;
                                                        event.currentTarget.src = fallbackAvatar;
                                                    }}
                                                />
                                                : <ProfileAvatar user={authUser} alt='Profile photo' />}
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type='file'
                                        accept='image/jpeg,image/png,image/webp'
                                        onChange={choosePhoto}
                                        className='hidden'
                                    />
                                    <div className='flex flex-wrap justify-center gap-2'>
                                        <button type='button' onClick={() => fileInputRef.current?.click()} className='rounded-md border border-white/25 px-3 py-2 text-sm hover:bg-white/10'>
                                            {photoFile ? 'Choose another photo' : 'Change Profile Photo'}
                                        </button>
                                        {authUser?.profilePhoto && (
                                            <button type='button' onClick={removePhoto} className='rounded-md px-3 py-2 text-sm text-red-200 hover:bg-white/10'>
                                                Remove Photo
                                            </button>
                                        )}
                                    </div>
                                    {photoFile && <p className='max-w-full truncate text-xs opacity-65'>{photoFile.name} · preview only until saved</p>}
                                </div>

                                <label className='block text-sm font-medium'>
                                    Full Name
                                    <input
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        maxLength={80}
                                        required
                                        className='mt-1 h-10 w-full rounded-md border border-white/20 bg-zinc-800 px-3 font-normal focus:border-white/50 focus:outline-none'
                                    />
                                </label>
                                <label className='block text-sm font-medium'>
                                    Username
                                    <input
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        maxLength={30}
                                        required
                                        className='mt-1 h-10 w-full rounded-md border border-white/20 bg-zinc-800 px-3 font-normal focus:border-white/50 focus:outline-none'
                                    />
                                </label>
                                <button disabled={isSaving} type='submit' className='w-full rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-50'>
                                    {isSaving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </form>
                        )}

                        {section === 'Privacy' && (
                            <div className='space-y-3'>
                                <h3 className='text-lg font-medium'>Status privacy</h3>
                                <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                    <p className='text-sm font-medium'>Who can see my status</p>
                                    <p className='mt-1 text-sm opacity-70'>Contacts — people you have an existing conversation with.</p>
                                    <p className='mt-3 text-xs opacity-55'>Status visibility is checked by the server. This app currently uses chat conversations as its contact relationship.</p>
                                </div>
                            </div>
                        )}

                        {section === 'Account' && (
                            <div className='space-y-3'>
                                <h3 className='text-lg font-medium'>Account</h3>
                                <p className='text-sm opacity-70'>Signed in as {authUser?.username}</p>
                                <button type='button' onClick={onLogout} className='rounded-md border border-red-300/30 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40'>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
        </section>
    );
};

export default SettingsPanel;
