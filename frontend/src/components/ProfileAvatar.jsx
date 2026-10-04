import React, { useState } from 'react';
import fallbackAvatar from '../assets/avatar-fallback.svg';
import { BASE_URL } from '..';

export const resolveImageUrl = (imagePath) => (
    typeof imagePath === 'string' && imagePath.startsWith('/uploads/')
        ? `${BASE_URL}${imagePath}`
        : typeof imagePath === 'string' && imagePath.startsWith('/api/')
            ? `${BASE_URL}${imagePath}`
            : imagePath
);

const getAvatarUrl = (user) => {
    const profilePhoto = user?.profilePhoto;
    if (profilePhoto && !profilePhoto.includes('avatar.iran.liara.run')) {
        return resolveImageUrl(profilePhoto);
    }

    const seed = encodeURIComponent(user?.username || user?.fullName || 'user');
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
};

const ProfileAvatar = ({ user, alt = 'User avatar' }) => {
    const avatarUrl = getAvatarUrl(user);
    const [failedUrl, setFailedUrl] = useState(null);

    return (
        <img
            src={failedUrl === avatarUrl ? fallbackAvatar : avatarUrl}
            alt={alt}
            onError={() => setFailedUrl(avatarUrl)}
        />
    );
};

export default ProfileAvatar;
