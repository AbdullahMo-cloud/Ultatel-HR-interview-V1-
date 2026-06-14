import React, { useMemo } from 'react';
import { EvaluationRecord } from './types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';
import { Users, UserX, UserCheck, Activity } from 'lucide-react';

interface Props {
  data: EvaluationRecord[];
}

export default function AnalyticsView({ data }: Props) {
  const [selectedInterviewer, setSelectedInterviewer] = React.useState('All');
  const [selectedMonth, setSelectedMonth] = React.useState('All');
  const [selectedSite, setSelectedSite] = React.useState('All');

  // Extract unique interviewers and months for filter dropdowns
  const availableInterviewers = useMemo(() => {
    const interviewers = new Set<string>();
    data.forEach(d => {
      if (d.interviewerName) interviewers.add(d.interviewerName);
    });
    return Array.from(interviewers).sort();
  }, [data]);

  const availableSites = useMemo(() => {
    const sites = new Set<string>();
    data.forEach(d => {
      if (d.candidateSite) sites.add(d.candidateSite);
    });
    return Array.from(sites).sort();
  }, [data]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach(d => {
      const date = new Date(d.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthStr);
    });
    return Array.from(months).sort((a,b) => b.localeCompare(a));
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (selectedInterviewer !== 'All' && d.interviewerName !== selectedInterviewer) return false;
      if (selectedSite !== 'All' && d.candidateSite !== selectedSite) return false;
      if (selectedMonth !== 'All') {
        const date = new Date(d.date);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr !== selectedMonth) return false;
      }
      return true;
    });
  }, [data, selectedInterviewer, selectedMonth, selectedSite]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return { total: 0, avgScore: 0, hired: 0, rejected: 0 };

    const avgScore = Math.round(filteredData.reduce((acc, curr) => acc + (curr.scoreInfo?.total || 0), 0) / total);
    const hired = filteredData.filter(d => ['Strong hire', 'Hire', 'Possible hire, only if mindset and honesty are strong'].includes(d.scoreInfo?.rec)).length;
    const rejected = total - hired;

    return { total, avgScore, hired, rejected };
  }, [filteredData]);

  const dailyTrendData = useMemo(() => {
    // Group by YYYY-MM-DD
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const dateStr = new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, Candidates: count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const interviewerData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const name = d.interviewerName || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, Evaluations: count })).sort((a,b) => b.Evaluations - a.Evaluations);
  }, [filteredData]);

  const recommendationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const rec = d.scoreInfo?.rec || 'Unknown';
      counts[rec] = (counts[rec] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredData]);

  const COLORS = ['#442ea4', '#288df7', '#ffb800', '#10b981', '#ef4444', '#64748b'];

  if (data.length === 0) {
    return (
      <div className="bg-white p-8 rounded border border-slate-200 text-center text-slate-500">
        No evaluation data available to analyze yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Filters:</span>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Month:</label>
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{new Date(m + '-02').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Interviewer:</label>
          <select 
            value={selectedInterviewer} 
            onChange={e => setSelectedInterviewer(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Interviewers</option>
            {availableInterviewers.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Site:</label>
          <select 
            value={selectedSite} 
            onChange={e => setSelectedSite(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Sites</option>
            {availableSites.map(s => (
              <option key={s} value={s}>{s === 'Alex' ? 'Alexandria' : s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
               <Users className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Total Candidates</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
               <Activity className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Avg. Score</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.avgScore} <span className="text-sm font-medium text-slate-400">/ 100</span></div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-green-600 mb-2">
               <UserCheck className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Passed (Any)</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.hired} <span className="text-sm font-medium text-slate-400">({Math.round(stats.hired / stats.total * 100)}%)</span></div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-red-500 mb-2">
               <UserX className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Failed</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.rejected} <span className="text-sm font-medium text-slate-400">({Math.round(stats.rejected / stats.total * 100)}%)</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
           <h3 className="text-sm font-bold text-slate-900 mb-6">Evaluation Volume by Date</h3>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dailyTrendData}>
                 <defs>
                   <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#442ea4" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#442ea4" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} allowDecimals={false} />
                 <RechartsTooltip 
                    contentStyle={{ borderRadius: '0.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                 />
                 <Area type="monotone" dataKey="Candidates" stroke="#442ea4" strokeWidth={3} fillOpacity={1} fill="url(#colorCandidates)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
           <h3 className="text-sm font-bold text-slate-900 mb-6">Evaluations per Interviewer</h3>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={interviewerData} layout="vertical" margin={{ left: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                 <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                 <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '0.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                 />
                 <Bar dataKey="Evaluations" fill="#288df7" radius={[0, 4, 4, 0]} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 lg:col-span-2">
           <h3 className="text-sm font-bold text-slate-900 mb-6">Recommendation Breakdown</h3>
           <div className="h-80 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={recommendationData}
                   cx="50%"
                   cy="50%"
                   innerRadius={80}
                   outerRadius={120}
                   paddingAngle={2}
                   dataKey="value"
                   stroke="none"
                 >
                   {recommendationData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <RechartsTooltip 
                    contentStyle={{ borderRadius: '0.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                 />
                 <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#475569' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
}
