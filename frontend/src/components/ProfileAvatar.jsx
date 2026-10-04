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

export const getAvatarUrl = (user) => {
    const profilePhoto = user?.profilePhoto;
    const isGeneratedAvatar = typeof profilePhoto === 'string' && (
        profilePhoto.includes('avatar.iran.liara.run') ||
        profilePhoto.includes('api.dicebear.com')
    );
    if (profilePhoto && !isGeneratedAvatar) {
        return resolveImageUrl(profilePhoto);
    }

    const gender = typeof user?.gender === 'string' ? user.gender.trim().toLowerCase() : '';
    if (gender !== 'male' && gender !== 'female') {
        return profilePhoto ? resolveImageUrl(profilePhoto) : fallbackAvatar;
    }

    const top = gender === 'male' ? 'shortFlat' : 'straight02';
    const seed = encodeURIComponent(user?.username || 'user');
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&top=${top}&topProbability=100`;
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
