import React, { useState, useEffect } from 'react';
import { AvatarSelector } from './AvatarSelector';

interface OnlineMenuProps {
  onCreate: (name: string, avatar: string) => void;
  onJoin: (id: string, name: string, avatar: string) => void;
  onBack: () => void;
  isConnecting: boolean;
  error: string | null;
  initialName: string;
  initialAvatar: string;
}

export const OnlineMenu: React.FC<OnlineMenuProps> = ({ onCreate, onJoin, onBack, isConnecting, error, initialName, initialAvatar }) => {
  const [joinId, setJoinId] = useState('');
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);

  // Tự động lấy ID từ URL nếu có (ví dụ: ?room=123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinId(roomParam);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <h3 className="text-xl font-bold text-blue-400 text-center mb-2">Chế độ Online (P2P)</h3>
      
      {error && <div className="bg-red-500/20 text-red-300 p-2 rounded text-sm text-center border border-red-500/50">{error}</div>}

      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 ml-1">Chọn Avatar & Tên:</label>
        <AvatarSelector selectedAvatar={avatar} onSelect={setAvatar} />
        <input
          type="text"
          placeholder="Nhập tên của bạn..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-bold"
          maxLength={10}
        />
      </div>

      <div className="border-t border-slate-700 my-2"></div>

      {/* Nếu có joinId từ URL, ẩn nút tạo phòng để tập trung vào việc Join */}
      {!joinId && (
        <button
            onClick={() => onCreate(name || 'Bạn', avatar)}
            disabled={isConnecting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
            {isConnecting ? 'Đang tạo phòng...' : 'Tạo phòng mới (Host)'}
        </button>
      )}

      {!joinId && (
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-600"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-sm">HOẶC</span>
            <div className="flex-grow border-t border-slate-600"></div>
          </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nhập ID phòng..."
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          className={`flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500 ${joinId ? 'border-green-500 bg-green-900/20' : ''}`}
        />
        <button
          onClick={() => onJoin(joinId, name || 'Bạn', avatar)}
          disabled={!joinId || isConnecting}
          className="px-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {joinId ? 'Vào Ngay' : 'Vào'}
        </button>
      </div>

      <button onClick={() => {
          // Xóa param trên URL khi quay lại để tránh kẹt ở màn hình join
          try {
            if (window.history.pushState) {
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.pushState({path:newUrl},'',newUrl);
            }
          } catch (e) {
            console.warn("Could not update history URL:", e);
          }
          onBack();
      }} className="mt-4 text-slate-400 hover:text-white underline text-sm">
        Quay lại Menu chính
      </button>
    </div>
  );
};