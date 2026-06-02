import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Shield, Camera, User, Mail, FileText, Calendar, MapPin, Globe, Tag, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

function AvatarPreview({ avatar, user, size = 'lg' }) {
  const dim = size === 'lg' ? 'w-24 h-24 text-2xl' : 'w-10 h-10 text-sm';
  const colorIdx = user?.username?.charCodeAt(0) % AVATAR_COLORS.length || 0;
  const initials = (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase();

  if (avatar) {
    return <img src={avatar} alt="avatar" className={`${dim} rounded-full object-cover ring-4 ring-violet-500/30 shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-linear-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center font-bold text-white shrink-0 ring-4 ring-violet-500/20`}>
      {initials}
    </div>
  );
}

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#7070a0] uppercase tracking-widest mb-2">
      <Icon size={11} />
      {label}
    </label>
    {children}
  </div>
);

const inputCls = "w-full bg-[#0d0d18] border border-[#252538] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3a3a52] focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all";

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    dob: user?.dob || '',
    location: user?.location || '',
    website: user?.website || '',
    pronouns: user?.pronouns || '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', { ...form, avatar: avatarPreview });
      updateUser(data.user);
      toast.success('Profile updated');
      onClose();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const age = form.dob
    ? Math.floor((Date.now() - new Date(form.dob)) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e30] shrink-0">
          <h2 className="font-semibold text-white text-base">Edit Profile</h2>
          <button onClick={onClose} className="text-[#555575] hover:text-white transition rounded-lg p-1 hover:bg-[#1e1e2e]">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Avatar section */}
          <div className="flex items-center gap-5 p-4 bg-[#0d0d18] border border-[#1e1e30] rounded-2xl">
            <div className="relative shrink-0">
              <AvatarPreview avatar={avatarPreview} user={user} size="lg" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center shadow-lg transition"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{user?.displayName || user?.username}</p>
              <p className="text-xs text-[#555575] truncate mt-0.5">{user?.email}</p>
              {age !== null && <p className="text-xs text-[#555575] mt-0.5">{age} years old</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg transition"
                >
                  Upload photo
                </button>
                {avatarPreview && (
                  <button
                    onClick={() => setAvatarPreview('')}
                    className="text-xs text-[#555575] hover:text-red-400 border border-[#252538] hover:border-red-500/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display Name" icon={User}>
              <input
                value={form.displayName}
                onChange={set('displayName')}
                maxLength={40}
                placeholder={user?.username}
                className={inputCls}
              />
            </Field>
            <Field label="Pronouns" icon={Tag}>
              <input
                value={form.pronouns}
                onChange={set('pronouns')}
                maxLength={30}
                placeholder="e.g. he/him"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Bio */}
          <Field label="Bio" icon={FileText}>
            <textarea
              value={form.bio}
              onChange={set('bio')}
              maxLength={200}
              rows={3}
              placeholder="Tell people about yourself..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-xs text-[#3a3a52] mt-1">{form.bio.length}/200</p>
          </Field>

          {/* DOB + Location */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" icon={Calendar}>
              <input
                type="date"
                value={form.dob}
                onChange={set('dob')}
                max={new Date().toISOString().split('T')[0]}
                className={`${inputCls} scheme-dark`}
              />
            </Field>
            <Field label="Location" icon={MapPin}>
              <input
                value={form.location}
                onChange={set('location')}
                maxLength={60}
                placeholder="City, Country"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Website */}
          <Field label="Website" icon={Globe}>
            <input
              value={form.website}
              onChange={set('website')}
              maxLength={100}
              placeholder="https://yoursite.com"
              className={inputCls}
            />
          </Field>

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl px-4 py-3">
              <p className="text-xs text-[#444460] uppercase tracking-widest mb-1">Username</p>
              <p className="text-sm text-white font-medium">@{user?.username}</p>
            </div>
            <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl px-4 py-3">
              <p className="text-xs text-[#444460] uppercase tracking-widest mb-1">Member since</p>
              <p className="text-sm text-white font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>

          {/* Encryption notice */}
          <div className="flex items-start gap-2.5 bg-violet-600/5 border border-violet-500/10 rounded-xl px-4 py-3">
            <Shield size={14} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-[#555575] leading-relaxed">
              Your messages are encrypted with AES-256 before transmission. Profile data is stored securely and never shared with third parties.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e30] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#252538] text-[#7070a0] hover:text-white hover:border-[#353550] text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
