import React from 'react';
import {
  LayoutDashboard,
  Shirt,
  ArrowDownToLine,
  ShoppingCart,
  ReceiptText,
  ArrowUpFromLine,
  SlidersHorizontal,
  Wallet,
  History,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
  Image as ImageIcon,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBrand, DEFAULT_BRAND_LOGO } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

export type NavPage =
  | 'dashboard'
  | 'master_data'
  | 'stock_in'
  | 'sales_pos'
  | 'sales_history'
  | 'stock_out'
  | 'adjustments'
  | 'expenses'
  | 'transactions'
  | 'reports'
  | 'excel'
  | 'chat'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { logoUrl, openEditLogo } = useBrand();
  const toast = useToast();

  const navItems: {
    id: NavPage;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master_data', label: 'Master Data', icon: Shirt },
    { id: 'stock_in', label: 'Stock In', icon: ArrowDownToLine },
    { id: 'sales_pos', label: 'New Sale (POS)', icon: ShoppingCart, badge: 'POS' },
    { id: 'sales_history', label: 'Sales History', icon: ReceiptText },
    { id: 'stock_out', label: 'Stock Out', icon: ArrowUpFromLine },
    { id: 'adjustments', label: 'Stock Adjustment', icon: SlidersHorizontal, adminOnly: true },
    { id: 'expenses', label: 'Pengeluaran', icon: Wallet },
    { id: 'transactions', label: 'Transaction History', icon: History },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'excel', label: 'Excel Sync', icon: FileSpreadsheet, badge: 'Import' },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare, badge: 'Live' },
    { id: 'settings', label: 'Settings & Users', icon: Settings },
  ];

  const handleNavClick = (page: NavPage) => {
    onSelectPage(page);
    onCloseMobile();
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Signed out successfully');
      onCloseMobile();
    } catch {
      toast.error('Logout failed');
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 border-r border-zinc-800/80 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-zinc-850 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo with quick click-to-edit action */}
          <button
            type="button"
            onClick={openEditLogo}
            title="Click to edit logo"
            className="group relative w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-750 hover:border-emerald-500/80 overflow-hidden flex items-center justify-center shadow-md shrink-0 transition-all p-0.5 cursor-pointer"
          >
            <img
              src={logoUrl || DEFAULT_BRAND_LOGO}
              alt="FEELFST Logo"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith(DEFAULT_BRAND_LOGO)) {
                  target.src = DEFAULT_BRAND_LOGO;
                }
              }}
            />
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="font-bold text-base tracking-wider text-zinc-100 font-['Space_Grotesk'] leading-none truncate">
                FEELFST
              </div>
              <button
                type="button"
                onClick={openEditLogo}
                title="Edit Logo"
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-400 mt-1 font-medium truncate">
              DASHBOARD DATA MANAGER
            </div>
          </div>
        </div>

        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ml-2 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Core Workflow
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const active = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    active ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Branding & Logo Edit Menu Item */}
        <div className="pt-3 mt-3 border-t border-zinc-850/80">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Branding &amp; Customization
          </div>
          <button
            type="button"
            onClick={() => {
              openEditLogo();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/80 border border-zinc-800/50 hover:border-zinc-700 transition-all group"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              <span>Edit Logo</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Customize
            </span>
          </button>
        </div>

        {/* Explicit Log Out on Menu */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-semibold">Log Out</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-900/50">
              Exit
            </span>
          </button>
        </div>
      </div>

      {/* User Info Card with quick logout */}
      <div className="p-3 border-t border-zinc-850 bg-zinc-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">{user?.name}</div>
              <div className="text-[10px] capitalize text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block w-64 h-screen fixed top-0 left-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-[85%] h-full z-10">{content}</div>
        </div>
      )}
    </>
  );
};
