import React, { useState } from 'react';
import { EvaluationRecord } from './types';
import { Download, Search, Trash2, Eye, Calendar, User } from 'lucide-react';

interface Props {
  data: EvaluationRecord[];
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export default function DatabaseView({ data, onDelete, onView }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('All');

  const availableSites = Array.from(new Set(data.map(r => r.candidateSite).filter(Boolean))).sort();

  const filteredData = data.filter(r => {
    const matchesSearch = (r.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.interviewerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSite = selectedSite === 'All' || r.candidateSite === selectedSite;
    return matchesSearch && matchesSite;
  });

  const handleExport = () => {
    const headers = ['Date', 'Interviewer', 'Candidate Name', 'Site', 'Email', 'Phone', 'Total Score', 'Mindset Score', 'Honesty Score', 'Coachability Score', 'Comm Score', 'Recommendation', 'Red Flags'];
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
        r.scoreInfo?.sec6 || 0,
        r.scoreInfo?.sec7 || 0,
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
