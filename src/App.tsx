import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { BrandProvider } from './context/BrandContext';
import { EditLogoModal } from './components/EditLogoModal';
import { Sidebar, NavPage } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { MasterData } from './pages/MasterData';
import { StockInPage } from './pages/StockInPage';
import { SalesPOS } from './pages/SalesPOS';
import { SalesHistory } from './pages/SalesHistory';
import { StockOutPage } from './pages/StockOutPage';
import { StockAdjustmentPage } from './pages/StockAdjustmentPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExcelImportExportPage } from './pages/ExcelImportExportPage';
import { SettingsAndUsersPage } from './pages/SettingsAndUsersPage';
import { ChatPage } from './pages/ChatPage';
import { api } from './services/api';
import { ProductWithStock, SizeKey } from './types';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Preselected product from global Barcode Scanner modal
  const [posPreselected, setPosPreselected] = useState<{
    product: ProductWithStock;
    size: SizeKey;
  } | null>(null);

  // Check low stock count periodically
  useEffect(() => {
    if (user) {
      api.getProducts().then((prods) => {
        const count = prods.filter((p) => p.total_stock <= 5).length;
        setLowStockCount(count);
      }).catch(console.error);
    }
  }, [user, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs tracking-widest uppercase font-mono">Loading FEELFST...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectProductForPOS = (product: ProductWithStock, size: SizeKey) => {
    setPosPreselected({ product, size });
    setCurrentPage('sales_pos');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex selection:bg-emerald-500 selection:text-zinc-950">
      {/* Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
        <Header
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          onOpenMobile={() => setIsMobileOpen(true)}
          lowStockCount={lowStockCount}
          onSelectProductForPOS={handleSelectProductForPOS}
        />

        <main className="flex-1 pb-16">
          {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === 'master_data' && <MasterData />}
          {currentPage === 'stock_in' && <StockInPage onNavigate={setCurrentPage} />}
          {currentPage === 'sales_pos' && (
            <SalesPOS
              initialPreselected={posPreselected}
              onClearPreselected={() => setPosPreselected(null)}
              onViewHistory={() => setCurrentPage('sales_history')}
            />
          )}
          {currentPage === 'sales_history' && <SalesHistory />}
          {currentPage === 'stock_out' && <StockOutPage />}
          {currentPage === 'adjustments' && <StockAdjustmentPage />}
          {currentPage === 'expenses' && <ExpensesPage />}
          {currentPage === 'transactions' && <TransactionHistoryPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'excel' && <ExcelImportExportPage />}
          {currentPage === 'chat' && <ChatPage onNavigate={setCurrentPage} />}
          {currentPage === 'settings' && <SettingsAndUsersPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrandProvider>
          <MainApp />
          <EditLogoModal />
        </BrandProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
