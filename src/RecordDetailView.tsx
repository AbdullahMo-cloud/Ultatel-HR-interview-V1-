import React, { useRef } from 'react';
import { EvaluationRecord, SectionDef } from './types';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldX, Mail, Copy, Brain, ShieldCheck, Target, MessageSquare, ClipboardList, CheckCircle, XCircle, Info, Image as ImageIcon, Activity, Pencil } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

interface Props {
  record: EvaluationRecord;
  onBack: () => void;
  onEdit: (id: string) => void;
  userEmail?: string;
  sections: SectionDef[];
}

export default function RecordDetailView({ record, onBack, onEdit, userEmail, sections }: Props) {
  const { scoreInfo } = record;
  const printRef = useRef<HTMLDivElement>(null);

  const finalResult = record.answers['q39'] as string | undefined;
  const overallFeedback = record.answers['q38'] as string | undefined;

  let resultColor = 'bg-orange-50 border-orange-200 text-orange-800';
  let ResultIcon = Info;
  if (finalResult === 'Accepted') {
    resultColor = 'bg-green-50 border-green-200 text-green-800';
    ResultIcon = CheckCircle;
  } else if (finalResult === 'Rejected') {
    resultColor = 'bg-red-50 border-red-200 text-red-800';
    ResultIcon = XCircle;
  }

  const handleCopyAndEmail = async () => {
    if (!printRef.current) return;
    
    try {
      const el = printRef.current;
      const dataUrl = await htmlToImage.toJpeg(el, { 
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        quality: 0.95,
        style: {
          width: '1200px',
          margin: '0',
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const width = 1200;
      const height = el.scrollHeight * (1200 / el.scrollWidth);
      
      const pdf = new jsPDF({
        orientation: height > width ? 'p' : 'l',
        unit: 'px',
        format: [width, height]
      });
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
      pdf.save(`Evaluation_${record.candidateName || 'Candidate'}.pdf`);
      
      alert('A PDF report has been downloaded!\n\nAn email draft will now open. Please attach the downloaded PDF to the email.');
      
      const subject = encodeURIComponent(`Candidate Evaluation: ${record.candidateName || 'Unnamed'}`);
      const to = userEmail ? encodeURIComponent(userEmail) : '';
      const cc = encodeURIComponent('tarek.moaz@ultatel.com;Mohamed.AbouElHassan@ultatel.com;sam.casey@ultatel.com;sophia.brooks@ultatel.com;Mariem.Embaby@ultatel.com;nadine.miller@ultatel.com;mohamed.aboelqassem@ultatel.com;mennatullah.bahaa@ultatel.com;esra.alidrisi@ultatel.com;florence.mark@ultatel.com');
      const emailBody = `Hi Team,

Please find attached the interview evaluation results for your reference.

Feel free to review the attached assessment at your convenience. If you would like any additional details, clarification on the scoring, or the underlying interview data, please let me know.

Thank you.`;
      window.location.href = `mailto:${to}?cc=${cc}&subject=${subject}&body=${encodeURIComponent(emailBody)}`;
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Error: ' + err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-blue transition-colors uppercase tracking-wider cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Database
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onEdit(record.id)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded shadow-sm hover:bg-slate-50 transition-all cursor-pointer">
            <Pencil className="w-4.5 h-4.5 text-brand-blue" /> Edit Candidate Evaluation
          </button>
          <button onClick={handleCopyAndEmail} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-xs font-bold rounded shadow hover:bg-brand-blue-light transition-all cursor-pointer">
            <Mail className="w-4 h-4" /> Download PDF & Email
          </button>
        </div>
      </div>

      <div ref={printRef} className="bg-white p-6 md:p-8 rounded shadow-sm border border-slate-200">
        <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{record.candidateName || 'Unnamed Candidate'}</h2>
            <div className="text-sm text-slate-500 mt-2 flex items-center gap-4">
               <span>Site: <span className="text-slate-900 font-medium">{record.candidateSite || '—'}</span></span>
            </div>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-4">
               <span>Interviewer: <span className="text-slate-900 font-medium">{record.interviewerName || 'N/A'}</span></span>
               <span>Date: <span className="text-slate-900 font-medium">{new Date(record.date).toLocaleString()}</span></span>
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Total Score</div>
             <div className="text-4xl font-black text-slate-900">{scoreInfo?.total || 0}</div>
             <div className={`mt-2 inline-block px-3 py-1 text-[10px] font-bold rounded uppercase tracking-tighter ${scoreInfo?.color || 'bg-slate-100 text-slate-500'}`}>
                {scoreInfo?.rec || 'Unknown'}
             </div>
          </div>
        </div>

        {finalResult && (
          <div className={`mb-8 p-4 rounded-lg border flex items-start gap-4 shadow-sm ${resultColor}`}>
            <ResultIcon className="w-8 h-8 flex-shrink-0 mt-1" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest bg-white/50 inline-flex items-center px-2 py-0.5 rounded mb-2 border border-black/5">Final Rating</div>
              <div className="font-bold text-xl mb-1">{finalResult}</div>
              {overallFeedback && <div className="text-sm opacity-90 leading-relaxed font-medium">{overallFeedback}</div>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {sections.filter(s => s.questions.some(q => q.type === 'rating')).map((section, idx) => {
               let maxPoints = 0;
               section.questions.forEach(q => {
                  if (q.type === 'rating' && q.options && Array.isArray(q.options)) {
                     const points = q.options.map((o: any) => o.points || 0);
                     if (points.length > 0) maxPoints += Math.max(...points);
                  }
               });
               const score = scoreInfo?.scoresBySection?.[section.id] || 0;
               const percent = maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0;
               
               return (
                  <div key={section.id} className="p-4 bg-slate-50 rounded border border-slate-100 relative overflow-hidden group">
                    <Activity className="absolute -right-4 -bottom-4 w-16 h-16 text-slate-200/50 group-hover:scale-110 group-hover:text-slate-300 transition-all duration-300" />
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5"><Activity className="w-4 h-4 text-brand-blue shrink-0" /> <span className="truncate">{section.title.split(':')[0]}</span></div>
                    <div className="text-xl font-bold text-slate-900 mt-2 relative z-10">
                      {score} / {maxPoints} <span className="text-sm text-slate-500 ml-1 font-semibold">({percent}%)</span>
                    </div>
                  </div>
               );
            })}
        </div>

        {(scoreInfo?.isMindsetFail || scoreInfo?.isDisciplineFail || scoreInfo?.isRetentionFail || (scoreInfo?.autoFails && scoreInfo.autoFails.length > 0)) && (
          <div className="mb-8 space-y-3">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logged Flags & Warnings</h4>
             {scoreInfo?.isMindsetFail && (
                <div className="flex items-start p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 text-red-500" />
                  High Quit Risk: Mindset score below 22.
                </div>
              )}
             {scoreInfo?.isDisciplineFail && (
                <div className="flex items-start p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 text-amber-500" />
                  High Risk: Discipline & Commitment score below 11.
                </div>
              )}
             {scoreInfo?.isRetentionFail && (
                <div className="flex items-start p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 text-amber-500" />
                  High Risk: Retention Risk score below 4.
                </div>
              )}
              {scoreInfo?.autoFails?.map((failMsg: string, idx: number) => (
                <div key={idx} className="flex items-start p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                  <ShieldX className="w-5 h-5 mr-2 flex-shrink-0 text-red-500" />
                  {failMsg}
                </div>
             ))}
          </div>
        )}

        <div>
           <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Full Responses</h3>
           <div className="space-y-8">
             {sections.map((sec, secIdx) => {
               // Only show sections with questions
               if (!sec.questions || sec.questions.length === 0) return null;
               
               // Check if any answers exist for this section
               const hasAnswers = sec.questions.some(q => record.answers[q.id] !== undefined && record.answers[q.id] !== '');
               if (!hasAnswers) return null;

               const SECTION_THEMES = [
                 { text: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-200', icon: 'text-blue-600' },
                 { text: 'text-purple-800', bg: 'bg-purple-100', border: 'border-purple-200', icon: 'text-purple-600' },
                 { text: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-200', icon: 'text-amber-600' },
                 { text: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-200', icon: 'text-emerald-600' },
                 { text: 'text-rose-800', bg: 'bg-rose-100', border: 'border-rose-200', icon: 'text-rose-600' },
                 { text: 'text-cyan-800', bg: 'bg-cyan-100', border: 'border-cyan-200', icon: 'text-cyan-600' },
                 { text: 'text-fuchsia-800', bg: 'bg-fuchsia-100', border: 'border-fuchsia-200', icon: 'text-fuchsia-600' },
                 { text: 'text-teal-800', bg: 'bg-teal-100', border: 'border-teal-200', icon: 'text-teal-600' },
                 { text: 'text-indigo-800', bg: 'bg-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
                 { text: 'text-orange-800', bg: 'bg-orange-100', border: 'border-orange-200', icon: 'text-orange-600' }
               ];
               const theme = SECTION_THEMES[secIdx % SECTION_THEMES.length];

               return (
                 <div key={sec.id} className="space-y-4">
                   <h4 className={`text-sm font-black tracking-widest uppercase flex items-center gap-2 px-3 py-2 rounded-md ${theme.bg} ${theme.text} border ${theme.border}`}>
                     <ClipboardList className={`w-4 h-4 ${theme.icon}`} /> {sec.title}
                   </h4>
                   <div className="bg-slate-50 rounded p-4 border border-slate-100 space-y-4">
                     {sec.questions.map(q => {
                       const rawAns = record.answers[q.id];
                       if (rawAns === undefined || rawAns === '') return null;

                       let displayAns = typeof rawAns === 'number' ? `Score: ${rawAns}` : rawAns;
                       
                       // Try to find text if it's a rating
                       if (q.type === 'rating' && q.options) {
                           const opt = (q.options as any[]).find(o => o.points === rawAns);
                           if (opt) displayAns = `${opt.points} pts - ${opt.label}: "${opt.text}"`;
                       }

                       const commentAns = record.answers[`${q.id}_comment`] || record.answers[`${q.id}_other`];
                       if (commentAns) {
                           displayAns = `${displayAns} (Comment: ${commentAns})`;
                       }

                       return (
                         <div key={q.id}>
                           <div className="text-xs text-slate-500 font-bold mb-1">{q.text}</div>
                           <div className="text-sm text-slate-900 font-medium bg-white p-3 rounded border border-slate-200 shrink-0 break-words whitespace-pre-wrap">
                             {displayAns}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
}
