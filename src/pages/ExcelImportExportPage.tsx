import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  AlertCircle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const ExcelImportExportPage: React.FC = () => {
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  // Preview data from server
  const [previewSheets, setPreviewSheets] = useState<any[]>([]);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number>(0);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setAnalyzing(true);
    setImportSuccessMessage('');
    setPreviewSheets([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await api.previewExcel(base64);
          setPreviewSheets(res.sheets || []);
          setSelectedSheetIdx(0);
          toast.success(`Parsed ${res.sheets.length} sheets from workbook.`);
        } catch (err: any) {
          toast.error(err.message || 'Failed to inspect Excel file');
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(selected);
    } catch (err: any) {
      toast.error('File read error');
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    const active = previewSheets[selectedSheetIdx];
    if (!active) return;

    let targetType: any = 'products';
    if (active.detectedType === 'Master Data') targetType = 'products';
    else if (active.detectedType === 'Pengeluaran') targetType = 'expenses';
    else if (active.detectedType === 'Sales') targetType = 'sales';

    setImporting(true);
    try {
      const res = await api.confirmImport({
        sheetName: active.sheetName,
        type: targetType,
        rows: active.dataPreview,
        created_by: user?.name || 'Admin',
      });

      toast.success(`Imported ${res.importedCount} records successfully.`);
      setImportSuccessMessage(`Successfully imported ${res.importedCount} records into database.`);
      setPreviewSheets([]);
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const currentSheet = previewSheets[selectedSheetIdx];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          Excel Data Sync &amp; Migration
        </h2>
        <p className="text-xs text-zinc-400">
          Import legacy workbooks with strict column validation and export real-time tables
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Import Section */}
        <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-zinc-100">Import Excel Workbook (.xlsx)</h3>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-zinc-750 hover:border-emerald-500/80 rounded-2xl p-6 text-center transition-colors bg-zinc-950/40">
            <input
              type="file"
              id="excel-file-upload"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="excel-file-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="p-3 bg-zinc-900 rounded-full text-emerald-400 border border-zinc-800">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <span className="font-bold text-sm text-zinc-200 block">
                  {file ? file.name : 'Click or drop Excel file to inspect'}
                </span>
                <span className="text-xs text-zinc-500 mt-1 block">
                  Supports Master Data, Stock In, Sales, Stock Out, and Pengeluaran sheets
                </span>
              </div>
            </label>
          </div>

          {analyzing && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Validating schema, duplicate SKU codes, and column headers...</span>
            </div>
          )}

          {importSuccessMessage && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          {/* Sheet Preview & Validation Report */}
          {currentSheet && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-300">Detected Sheet:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold">
                    {currentSheet.sheetName} ({currentSheet.detectedType})
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {currentSheet.validRows} valid / {currentSheet.totalRows} rows
                </div>
              </div>

              {/* Validation errors */}
              {currentSheet.errors.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Schema Validation Notices ({currentSheet.errors.length}):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-amber-200">
                    {currentSheet.errors.map((err: any, i: number) => (
                      <div key={i}>
                        Row {err.row}: [{err.field}] {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || currentSheet.validRows === 0}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                <span>
                  {importing
                    ? 'Writing to Database...'
                    : `Confirm & Import ${currentSheet.validRows} Valid Rows`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Export Hub (Section 30) */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Download className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-zinc-100">One-Click Excel Exports</h3>
          </div>

          <p className="text-xs text-zinc-400">
            Export high-fidelity spreadsheet workbooks matching original Excel schema formats.
          </p>

          <div className="space-y-2.5">
            {[
              { id: 'master_data', label: 'Master Data & Stock Balances', desc: 'All products with S-XXL inventory' },
              { id: 'sales', label: 'Sales Transactions Register', desc: 'Invoices, customers, retail prices, channels' },
              { id: 'stock_in', label: 'Stock In Shipments', desc: 'Vendor batches, incoming quantities, taxes' },
              { id: 'stock_out', label: 'Stock Out Audit Ledger', desc: 'Endorsements, promotional samples, write-offs' },
              { id: 'expenses', label: 'Pengeluaran (Expenses)', desc: 'Operational, hangtags, printing & supplies' },
              { id: 'profit_loss', label: 'Profit & Loss Statement', desc: 'Revenue, COGS, Gross Margin & Net Profit' },
            ].map((exp) => (
              <div
                key={exp.id}
                className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between hover:border-zinc-750 transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-zinc-200">{exp.label}</div>
                  <div className="text-[11px] text-zinc-500">{exp.desc}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/excel/export?reportType=${exp.id}&format=xlsx`}
                    download
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold transition-colors"
                  >
                    .XLSX
                  </a>
                  <a
                    href={`/api/excel/export?reportType=${exp.id}&format=csv`}
                    download
                    className="px-2 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 text-xs font-mono transition-colors"
                  >
                    .CSV
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
