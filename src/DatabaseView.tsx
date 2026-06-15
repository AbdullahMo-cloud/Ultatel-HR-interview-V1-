import React, { useState } from 'react';
import { EvaluationRecord } from './types';
import { Download, Search, Trash2, Eye, Calendar, User, FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle, Link2, Unlink, LogIn, ExternalLink, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { createSpreadsheet, validateSpreadsheet, appendRows } from './sheetsService';

interface Props {
  data: EvaluationRecord[];
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  sheetsConfig: {
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    spreadsheetTitle: string | null;
    syncEnabled: boolean;
  };
  setSheetsConfig: React.Dispatch<React.SetStateAction<{
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    spreadsheetTitle: string | null;
    syncEnabled: boolean;
  }>>;
  googleToken: string | null;
  onAuthorizeSheets: () => Promise<string | null>;
}

export default function DatabaseView({ 
  data, 
  onDelete, 
  onView,
  onEdit,
  sheetsConfig,
  setSheetsConfig,
  googleToken,
  onAuthorizeSheets
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('All');
  
  // Google Sheets auxiliary states
  const [showSheetsCard, setShowSheetsCard] = useState(false);
  const [existingSpreadsheetId, setExistingSpreadsheetId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllSuccess, setSyncAllSuccess] = useState(false);
  const [sheetError, setSheetError] = useState('');

  const availableSites = Array.from(new Set(data.map(r => r.candidateSite).filter(Boolean))).sort();

  const filteredData = data.filter(r => {
    const matchesSearch = (r.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.interviewerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSite = selectedSite === 'All' || r.candidateSite === selectedSite;
    return matchesSearch && matchesSite;
  });

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
    setSheetError('');
    try {
      let activeToken = googleToken;
      if (!activeToken) {
        activeToken = await onAuthorizeSheets();
      }
      if (!activeToken) {
        throw new Error("Authorization is required to create a spreadsheet.");
      }
      
      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(activeToken, "Ultatel BDR Interview Evaluations Dashboard");
      setSheetsConfig({
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle: "Ultatel BDR Interview Evaluations Dashboard",
        syncEnabled: true
      });
    } catch (err: any) {
      console.error(err);
      setSheetError(err.message || "Could not auto-generate spreadsheet.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExistingSheet = async () => {
    if (!existingSpreadsheetId.trim()) {
      setSheetError("Please enter a valid Google Spreadsheet URL or ID.");
      return;
    }
    
    let targetId = existingSpreadsheetId.trim();
    // Extract ID if URL is pasted
    const urlMatch = targetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      targetId = urlMatch[1];
    }
    
    setIsLinking(true);
    setSheetError('');
    try {
      let activeToken = googleToken;
      if (!activeToken) {
        activeToken = await onAuthorizeSheets();
      }
      if (!activeToken) {
        throw new Error("Authorization is required to connect spreadsheet.");
      }
      
      const title = await validateSpreadsheet(activeToken, targetId);
      const url = `https://docs.google.com/spreadsheets/d/${targetId}/edit`;
      
      setSheetsConfig({
        spreadsheetId: targetId,
        spreadsheetUrl: url,
        spreadsheetTitle: title,
        syncEnabled: true
      });
      setExistingSpreadsheetId('');
    } catch (err: any) {
      console.error(err);
      setSheetError(err.message || "Failed to link. Confirm spreadsheet ID is correct & spreadsheets permissions are granted.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleBatchSyncAll = async () => {
    if (!sheetsConfig.spreadsheetId) return;
    setIsSyncingAll(true);
    setSheetError('');
    setSyncAllSuccess(false);
    try {
      let activeToken = googleToken;
      if (!activeToken) {
        activeToken = await onAuthorizeSheets();
      }
      if (!activeToken) {
        throw new Error("Authorization is required to perform batch sync.");
      }
      
      const rows = data.map(record => {
        let redFlags = "None";
        if (record.scoreInfo?.isMindsetFail) {
          redFlags = "High Quit Risk (Mindset Failed)";
        }
        if (record.scoreInfo?.autoFails && record.scoreInfo.autoFails.length > 0) {
          const fails = record.scoreInfo.autoFails.join("; ");
          redFlags = redFlags === "None" ? fails : `${redFlags}; ${fails}`;
        }

        return [
          new Date(record.date).toLocaleDateString() + " " + new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          record.interviewerName || "",
          record.candidateName || "",
          record.candidateSite || "",
          record.candidateEmail || "",
          record.candidatePhone || "",
          record.scoreInfo?.total || 0,
          record.scoreInfo?.rec || "",
          record.scoreInfo?.sec3 || 0,
          record.scoreInfo?.sec4 || 0,
          record.scoreInfo?.sec5 || 0,
          record.scoreInfo?.sec6 || 0,
          record.scoreInfo?.sec7 || 0,
          record.scoreInfo?.sec8 || 0,
          redFlags
        ];
      });

      if (rows.length === 0) {
        throw new Error("There are no records in the candidate database to sync.");
      }

      await appendRows(activeToken, sheetsConfig.spreadsheetId, "Sheet1!A1", rows);
      setSyncAllSuccess(true);
      setTimeout(() => setSyncAllSuccess(false), 4500);
    } catch (err: any) {
      console.error(err);
      setSheetError(err.message || "Batch synchronization failed.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDisconnectSheet = () => {
    if (confirm("Are you sure you want to disconnect this Google Sheet? Evaluated BDR candidates will stop uploading to this sheet.")) {
      setSheetsConfig({
        spreadsheetId: null,
        spreadsheetUrl: null,
        spreadsheetTitle: null,
        syncEnabled: false
      });
      setSheetError('');
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Interviewer', 'Candidate Name', 'Site', 'Email', 'Phone', 'Total Score', 'Mindset Score', 'Honesty Score', 'Discipline Score', 'Coachability Score', 'Comm Score', 'Retention Score', 'Recommendation', 'Red Flags'];
    const rows = data.map(r => [
        `"${new Date(r.date).toLocaleDateString()}"`,
        `"${r.interviewerName || ''}"`,
        `"${r.candidateName || ''}"`,
        `"${r.candidateSite || ''}"`,
        `"${r.candidateEmail || ''}"`,
        `"${r.candidatePhone || ''}"`,
        r.scoreInfo?.total || 0,
        r.scoreInfo?.sec3 || 0,
        r.scoreInfo?.sec4 || 0,
        r.scoreInfo?.sec5 || 0,
        r.scoreInfo?.sec6 || 0,
        r.scoreInfo?.sec7 || 0,
        r.scoreInfo?.sec8 || 0,
        `"${r.scoreInfo?.rec || ''}"`,
        `"${r.scoreInfo?.autoFails?.join('; ') || ''}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ultatel_evaluations.csv';
    a.click();
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded shadow-sm border border-slate-200">
      
      {/* Google Sheets Integration Collapsible Section */}
      <div className="mb-6 border border-emerald-100 rounded-xl bg-emerald-50/20 overflow-hidden">
        <button 
          onClick={() => setShowSheetsCard(!showSheetsCard)}
          className="w-full flex items-center justify-between p-4 bg-emerald-50/40 hover:bg-emerald-50/60 transition-colors text-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                Google Sheets Database Sync
                {sheetsConfig.spreadsheetId ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    Not Connected
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Save BDR candidate evaluations directly to a shared spreadsheet in real-time.</p>
            </div>
          </div>
          <div className="text-slate-400">
            {showSheetsCard ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showSheetsCard && (
          <div className="p-5 border-t border-emerald-100/60 bg-white">
            {sheetError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-500" />
                <div>{sheetError}</div>
              </div>
            )}

            {!sheetsConfig.spreadsheetId ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Connect your Google Spreadsheet to sync evaluation data. Every candidate response is appended as a real-time row automatically:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Create Automatically */}
                  <div className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Option 1: Setup a Brand New Sheet</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Let the app automatically generate a fresh, pre-formatted spreadsheet inside your Google Drive with the correct scorecard columns.</p>
                    </div>
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={isCreating}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isCreating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Creating Spreadsheet...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Auto-Create preprocessed Sheet
                        </>
                      )}
                    </button>
                  </div>

                  {/* Option B: Link Existing */}
                  <div className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Option 2: Connect Existing Spreadsheet</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Paste the URL or the ID of an existing Google Spreadsheet inside your company workspace.</p>
                      
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Spreadsheet URL or Spreadsheet ID..."
                          value={existingSpreadsheetId}
                          onChange={(e) => setExistingSpreadsheetId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleConnectExistingSheet}
                      disabled={isLinking}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isLinking ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Verifying Sheet...
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          Link Existing Spreadsheet
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!googleToken && (
                  <div className="pt-2">
                    <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg">
                      🔑 Note: Setup will prompt safe Google permission grant to enable Sheets access dynamically.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-emerald-100 rounded-xl bg-emerald-50/10 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        {sheetsConfig.spreadsheetTitle || "Connected Spreadsheet"}
                      </h4>
                      <div className="flex flex-wrap gap-2.5 mt-1">
                        <a 
                          href={sheetsConfig.spreadsheetUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          Open in Google Sheets
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-slate-350">•</span>
                        <button
                          onClick={handleDisconnectSheet}
                          className="text-[11px] text-red-500 font-bold hover:underline flex items-center gap-0.5"
                        >
                          Disconnect Sheet
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sheetsConfig.syncEnabled}
                        onChange={(e) => setSheetsConfig(prev => ({ ...prev, syncEnabled: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded bg-slate-50 border-slate-200 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-700">Real-time sync</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-slate-150 bg-slate-50/40 rounded-xl">
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Export HR Database ({data.length} evaluations)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bulk synchronize and export all current candidates records securely inside this spreadsheet.</p>
                  </div>
                  <div>
                    <button
                      onClick={handleBatchSyncAll}
                      disabled={isSyncingAll || data.length === 0}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.98] transition-all"
                    >
                      {isSyncingAll ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Synchronizing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Batch Sync Database
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {syncAllSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Success! All {data.length} candidate evaluations exported safely into your Google Spreadsheet.</span>
                  </div>
                )}

                {!googleToken && (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-medium rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span>Your Google access token has expired or is missing. Authenticate to sync and perform spreadsheet updates:</span>
                      <button 
                        onClick={onAuthorizeSheets}
                        className="mt-2 block px-3 py-1 bg-amber-600 text-white rounded text-[11px] font-black hover:bg-amber-700 active:scale-[0.98] transition-all uppercase tracking-wider"
                      >
                        Authorize Sheets Connection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Candidate Database</h2>
          <p className="text-xs text-slate-500 mt-1">Review historical evaluations and extract data.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedSite}
            onChange={e => setSelectedSite(e.target.value)}

            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Sites</option>
            {availableSites.map(s => (
              <option key={s} value={s}>{s === 'Alex' ? 'Alexandria' : s}</option>
            ))}
          </select>
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none transition-shadow text-sm"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded shadow-sm hover:bg-opacity-90 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-t border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              <th className="p-4 rounded-tl">Date / Time</th>
              <th className="p-4">Candidate</th>
              <th className="p-4">Site</th>
              <th className="p-4">Interviewer</th>
              <th className="p-4 text-center">Score</th>
              <th className="p-4">Recommendation</th>
              <th className="p-4 text-right rounded-tr">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            ) : filteredData.map(record => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(record.date).toLocaleDateString()}
                    <span className="text-xs text-slate-400 ml-1">{new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{record.candidateName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{record.candidateEmail || 'No email'}</div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                    {record.candidateSite || '—'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    {record.interviewerName || 'Unknown'}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center justify-center font-bold text-slate-900">
                    {record.scoreInfo?.total || 0}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded uppercase tracking-tighter ${record.scoreInfo?.color || 'bg-slate-100 text-slate-500'}`}>
                    {record.scoreInfo?.rec || 'Unknown'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(record.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit candidate evaluation and details">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onView(record.id)} className="p-1.5 text-brand-blue hover:bg-brand-light rounded transition-colors" title="View Full Record">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Record">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
