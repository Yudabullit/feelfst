import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Save,
  KeyRound,
  Image as ImageIcon,
  Edit3,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useBrand, DEFAULT_BRAND_LOGO } from '../context/BrandContext';

export const SettingsAndUsersPage: React.FC = () => {
  const toast = useToast();
  const { user: currentUser, isAdmin } = useAuth();
  const { logoUrl, openEditLogo } = useBrand();

  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [shopSettings, setShopSettings] = useState({
    shop_name: 'FEELFST',
    currency: 'IDR',
    low_stock_threshold: 5,
  });

  const [newChannel, setNewChannel] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // New User modal/inputs
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');

  const fetchData = async () => {
    try {
      const [uList, sett] = await Promise.all([api.getUsers(), api.getSettings()]);
      setUsers(uList);
      if (sett.settings) setShopSettings(sett.settings);
      if (sett.payment_channels) setChannels(sett.payment_channels);
      if (sett.expense_categories) setExpenseCategories(sett.expense_categories);
    } catch (err: any) {
      toast.error('Failed to load settings');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings({
        settings: shopSettings,
        payment_channels: channels,
        expense_categories: expenseCategories,
      });
      toast.success('System settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  const handleAddChannel = () => {
    if (!newChannel.trim()) return;
    if (channels.includes(newChannel.trim())) {
      toast.error('Channel already exists');
      return;
    }
    setChannels([...channels, newChannel.trim()]);
    setNewChannel('');
  };

  const handleRemoveChannel = (ch: string) => {
    setChannels(channels.filter((c) => c !== ch));
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (expenseCategories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    setExpenseCategories([...expenseCategories, newCategory.trim()]);
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    setExpenseCategories(expenseCategories.filter((c) => c !== cat));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) {
      toast.error('All fields are required');
      return;
    }

    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim(),
        role: newRole,
      });
      toast.success(`User ${newUsername} created.`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (uId: string, uName: string) => {
    if (uId === currentUser?.id) {
      toast.error('Cannot delete yourself.');
      return;
    }
    if (!confirm(`Delete user "${uName}"?`)) return;
    try {
      await api.deleteUser(uId);
      toast.success('User deleted.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleResetSeed = async () => {
    if (
      !confirm(
        'WARNING: This will reset all inventory, sales, stock in, stock out, and expenses back to the original Excel seed data. Continue?'
      )
    ) {
      return;
    }
    try {
      await api.resetSeed();
      toast.success('Database restored to initial Excel seed!');
      window.location.reload();
    } catch (err: any) {
      toast.error('Reset failed');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          System Settings &amp; Access Control
        </h2>
        <p className="text-xs text-zinc-400">
          Configure business rules, sales payment channels, expense groups and team accounts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Business Configuration */}
        <div className="lg:col-span-6 space-y-6">
          {/* Brand Logo & Identity Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <span>Brand Logo &amp; Identity</span>
              </h3>
              <button
                type="button"
                onClick={openEditLogo}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Logo</span>
              </button>
            </div>

            <div className="flex items-center gap-4 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-700/80 p-1 flex items-center justify-center shrink-0 shadow-md">
                <img
                  src={logoUrl || DEFAULT_BRAND_LOGO}
                  alt="Brand Logo"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith(DEFAULT_BRAND_LOGO)) {
                      target.src = DEFAULT_BRAND_LOGO;
                    }
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-200 truncate">
                  Active Brand Emblem
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 break-all line-clamp-1">
                  {logoUrl.startsWith('data:') ? 'Custom Uploaded Image (Base64)' : logoUrl}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Applied to Sidebar, Header, and Login Screen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Preferences */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span>Shop &amp; Inventory Parameters</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Brand Name</label>
                <input
                  type="text"
                  value={shopSettings.shop_name}
                  onChange={(e) =>
                    setShopSettings({ ...shopSettings, shop_name: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Currency Format</label>
                  <input
                    type="text"
                    disabled
                    value="IDR (Rp)"
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-400 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={shopSettings.low_stock_threshold}
                    onChange={(e) =>
                      setShopSettings({
                        ...shopSettings,
                        low_stock_threshold: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-100 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Channels (Section 8) */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-100 border-b border-zinc-800 pb-3">
              Sales &amp; Payment Channels (Via)
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="e.g. TikTok Shop, WhatsApp, Krisna"
                className="flex-1 bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={handleAddChannel}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold rounded-xl"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {channels.map((ch) => (
                <span
                  key={ch}
                  className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs flex items-center gap-2 text-zinc-200"
                >
                  <span>{ch}</span>
                  <button
                    onClick={() => handleRemoveChannel(ch)}
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Save Settings */}
          <button
            type="button"
            onClick={handleSaveSettings}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save System Preferences</span>
          </button>
        </div>

        {/* Right Column: User Management & Database Maintenance */}
        <div className="lg:col-span-6 space-y-6">
          {/* Team Members List */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Authorized Accounts</span>
              </h3>
              <span className="text-xs text-zinc-400">{users.length} active users</span>
            </div>

            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 font-bold flex items-center justify-center text-zinc-300">
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200">{u.name}</div>
                      <div className="text-zinc-500 text-[11px] font-mono">@{u.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {u.role}
                    </span>

                    {isAdmin && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Create user form */}
            {isAdmin && (
              <form
                onSubmit={handleCreateUser}
                className="pt-3 border-t border-zinc-850 space-y-3 text-xs"
              >
                <div className="font-semibold text-zinc-300">Create New Team Account</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full Name"
                    className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-zinc-100"
                  />
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-zinc-100"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-zinc-200"
                  >
                    <option value="staff">Staff (Sales/Stock)</option>
                    <option value="admin">Administrator (Full)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl transition-colors"
                >
                  Create Account
                </button>
              </form>
            )}
          </div>

          {/* Database Maintenance / Reset (Section 41) */}
          <div className="bg-rose-950/20 border border-rose-900/60 rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset Database to Excel Seed State</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Resets all products, stock in, sales transactions, endorsements, and expenses to the
              verified Excel benchmark scenario.
            </p>
            <button
              onClick={handleResetSeed}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Reset to Factory Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
