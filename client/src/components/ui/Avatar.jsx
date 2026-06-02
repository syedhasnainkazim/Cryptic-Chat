export default function Avatar({ user, size = 10, showOnline = false, online = false }) {
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const colors = ['bg-violet-600', 'bg-indigo-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
  const colorIdx = user?.username?.charCodeAt(0) % colors.length || 0;
  const sz = `w-${size} h-${size}`;

  return (
    <div className={`relative flex-shrink-0 ${sz} rounded-full ${colors[colorIdx]} flex items-center justify-center text-white font-semibold text-xs select-none overflow-hidden`}>
      {user?.avatar
        ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
      {showOnline && online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0d0d14] rounded-full" />
      )}
    </div>
  );
}
