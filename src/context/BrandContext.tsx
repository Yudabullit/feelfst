import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const DEFAULT_BRAND_LOGO = '/ffchrome copy.png';

interface BrandContextType {
  logoUrl: string;
  setLogoUrl: (newUrl: string) => Promise<void>;
  resetLogo: () => Promise<void>;
  isEditLogoOpen: boolean;
  openEditLogo: () => void;
  closeEditLogo: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    return localStorage.getItem('feelfst_brand_logo') || DEFAULT_BRAND_LOGO;
  });
  const [isEditLogoOpen, setIsEditLogoOpen] = useState(false);

  // Synchronize with server settings on initial mount
  useEffect(() => {
    api.getSettings()
      .then((data) => {
        if (data?.settings?.logo_url) {
          setLogoUrlState(data.settings.logo_url);
          localStorage.setItem('feelfst_brand_logo', data.settings.logo_url);
        }
      })
      .catch(() => {
        // Silently keep local storage logo or default
      });
  }, []);

  // Update favicon if logo changes
  useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (favicon && logoUrl) {
      favicon.href = logoUrl;
    }
  }, [logoUrl]);

  const setLogoUrl = async (newUrl: string) => {
    const trimmed = newUrl.trim() || DEFAULT_BRAND_LOGO;
    setLogoUrlState(trimmed);
    localStorage.setItem('feelfst_brand_logo', trimmed);
    try {
      await api.updateSettings({
        settings: {
          logo_url: trimmed,
        },
      });
    } catch (err) {
      console.warn('Failed to persist logo to server settings, cached in localStorage', err);
    }
  };

  const resetLogo = async () => {
    await setLogoUrl(DEFAULT_BRAND_LOGO);
  };

  const openEditLogo = () => setIsEditLogoOpen(true);
  const closeEditLogo = () => setIsEditLogoOpen(false);

  return (
    <BrandContext.Provider
      value={{
        logoUrl,
        setLogoUrl,
        resetLogo,
        isEditLogoOpen,
        openEditLogo,
        closeEditLogo,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
