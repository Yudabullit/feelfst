import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useBrand, DEFAULT_BRAND_LOGO } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

const PRESET_LOGOS = [
  {
    name: 'Shared FEELFST Emblem',
    url: '/ffchrome copy.png',
    description: 'Electric liquid chrome metal emblem',
  },
  {
    name: 'Chrome FF Emblem',
    url: '/ffchrome.png',
    description: 'Alternative chrome metallic emblem',
  },
  {
    name: 'FEELFST Luxury Badge',
    url: '/assets/feelfst_chrome_logo.jpg',
    description: 'Dark luxury metallic crest',
  },
];

export const EditLogoModal: React.FC = () => {
  const { logoUrl, setLogoUrl, resetLogo, isEditLogoOpen, closeEditLogo } = useBrand();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(logoUrl);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync current logo when modal opens
  React.useEffect(() => {
    if (isEditLogoOpen) {
      setPreviewUrl(logoUrl);
      setCustomUrlInput(logoUrl.startsWith('data:') ? '' : logoUrl);
      setFileName('');
    }
  }, [isEditLogoOpen, logoUrl]);

  if (!isEditLogoOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreviewUrl(result);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) {
      toast.error('Please enter an image URL');
      return;
    }
    setPreviewUrl(customUrlInput.trim());
    toast.info('Preview updated. Click "Save & Apply" to confirm.');
  };

  const handleSave = async () => {
    if (!previewUrl) {
      toast.error('Please select or upload a logo first');
      return;
    }
    setIsSaving(true);
    try {
      await setLogoUrl(previewUrl);
      toast.success('Sidebar and Login logo updated successfully!');
      closeEditLogo();
    } catch {
      toast.error('Failed to save logo changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetLogo();
      setPreviewUrl(DEFAULT_BRAND_LOGO);
      setCustomUrlInput(DEFAULT_BRAND_LOGO);
      setFileName('');
      toast.success('Logo reset to default FEELFST emblem');
      closeEditLogo();
    } catch {
      toast.error('Failed to reset logo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeEditLogo}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden z-10 text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Customize Brand Logo</h2>
              <p className="text-xs text-zinc-400">
                Update the logo displayed on the Sidebar menu and Login screen
              </p>
            </div>
          </div>
          <button
            onClick={closeEditLogo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Method Selection Tabs */}
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'url'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'presets'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50 hover:bg-zinc-950'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-xs text-zinc-200">
                  Click to browse or drag and drop logo image
                </div>
                <div className="text-[11px] text-zinc-400">
                  Supports PNG, JPG, WebP, SVG (recommended square 1:1, max 5MB)
                </div>
                {fileName && (
                  <div className="mt-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    Selected: {fileName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Custom URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleApplyUrl} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Direct Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png or /ffchrome copy.png"
                    className="flex-1 bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    Load Preview
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  You can paste web URLs or local public image paths like <code className="text-zinc-300">/ffchrome copy.png</code>.
                </p>
              </div>
            </form>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_LOGOS.map((preset) => {
                const isSelected = previewUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(preset.url);
                      setCustomUrlInput(preset.url);
                      setFileName('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-750 p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold text-zinc-200">{preset.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{preset.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Previews Section */}
          <div className="border-t border-zinc-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Live Previews
              </span>
              <span className="text-[11px] text-zinc-400">
                Real-time preview on both placements
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sidebar Header Preview */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Sidebar Placement
                </div>
                <div className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 overflow-hidden flex items-center justify-center shadow-md shrink-0">
                    <img
                      src={previewUrl}
                      alt="Sidebar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = DEFAULT_BRAND_LOGO;
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-wider text-zinc-100 font-['Space_Grotesk'] leading-none">
                      FEELFST
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-zinc-400 mt-1 font-medium">
                      DASHBOARD DATA MANAGER
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Page Preview */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Login Screen Placement
                </div>
                <div className="p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700/80 overflow-hidden items-center justify-center shadow-xl p-0.5 mb-1">
                    <img
                      src={previewUrl}
                      alt="Login Preview"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = DEFAULT_BRAND_LOGO;
                      }}
                    />
                  </div>
                  <div className="text-xs font-black tracking-widest font-['Space_Grotesk'] text-zinc-100">
                    FEELFST
                  </div>
                  <div className="text-[8px] uppercase tracking-widest text-zinc-400 font-medium">
                    DASHBOARD DATA MANAGER
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeEditLogo}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Apply Logo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
