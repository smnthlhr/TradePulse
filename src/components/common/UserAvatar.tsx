import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Trader',
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  // If the avatarUrl is the legacy unsplash photo, discard it to ensure neutral default
  const isLegacyPhoto =
    avatarUrl &&
    (avatarUrl.includes('photo-1534528741775-53994a69daeb') ||
      avatarUrl.includes('unsplash.com'));

  const validUrl = isLegacyPhoto ? undefined : avatarUrl;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size];

  if (validUrl) {
    return (
      <img
        src={validUrl}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover border border-zinc-200 dark:border-zinc-700 ${className}`}
      />
    );
  }

  // Generate initials (e.g. "Somnath Trader" -> "ST")
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center border border-emerald-500/30 shadow-xs shrink-0 select-none ${className}`}
      title={name}
    >
      {initials || <UserIcon className={iconSizes} />}
    </div>
  );
};
