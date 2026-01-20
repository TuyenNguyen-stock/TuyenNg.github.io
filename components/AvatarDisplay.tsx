import React from 'react';

interface AvatarDisplayProps {
  avatar: string;
  size?: string;
  fontSize?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ avatar, size = "w-16 h-16", fontSize = "text-4xl" }) => {
  // Kiểm tra an toàn xem chuỗi có phải là ảnh base64 không
  const isImg = avatar && avatar.startsWith('data:image');

  return (
    <div className={`${size} rounded-full border-2 border-slate-600 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md`}>
      {isImg ? (
        <img 
            src={avatar} 
            alt="avt" 
            className="w-full h-full object-cover" 
            onError={(e) => {
                // Nếu ảnh lỗi, fallback về icon mặc định
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerText = '👤';
                    e.currentTarget.parentElement.classList.add('text-2xl');
                }
            }}
        />
      ) : (
        <span className={fontSize} role="img" aria-label="avatar">{avatar || '👤'}</span>
      )}
    </div>
  );
};
