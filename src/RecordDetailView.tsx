import React, { useRef } from 'react';
import { EvaluationRecord } from './types';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldX, Mail, Copy, Brain, ShieldCheck, Target, MessageSquare, ClipboardList, CheckCircle, XCircle, Info, Image as ImageIcon } from 'lucide-react';
import { sections } from './data';
import * as htmlToImage from 'html-to-image';

interface Props {
  record: EvaluationRecord;
  onBack: () => void;
}

export default function RecordDetailView({ record, onBack }: Props) {
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
      const dataUrl = await htmlToImage.toPng(printRef.current, { 
        backgroundColor: '#ffffff',
        pixelRatio: 1,
        style: {
          width: '900px',
          margin: '0'
        }
      });
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        alert('Report image copied to clipboard!\n\nAn email draft will now open. Please paste (Ctrl+V) the image into the email body.');
        
        const subject = encodeURIComponent(`Candidate Evaluation: ${record.candidateName || 'Unnamed'}`);
        window.location.href = `mailto:?subject=${subject}`;
      } catch (clipboardErr) {
         console.error('Clipboard error:', clipboardErr);
         alert('Could not copy image automatically to clipboard (browser restriction). You may need to take a screenshot instead.');
      }
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('Failed to generate image. Error: ' + err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-blue transition-colors uppercase tracking-wider cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Database
        </button>
        <button onClick={handleCopyAndEmail} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-xs font-bold rounded shadow hover:bg-brand-blue-light transition-all cursor-pointer">
          <ImageIcon className="w-4 h-4" /> Copy Report as Image & Email
        </button>
      </div>

      <div ref={printRef} className="bg-white p-6 md:p-8 rounded shadow-sm border border-slate-200">
        <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{record.candidateName || 'Unnamed Candidate'}</h2>
            <div className="text-sm text-slate-500 mt-2 flex items-center gap-4">
               <span>Email: <span className="text-slate-900 font-medium">{record.candidateEmail || 'N/A'}</span></span>
               <span>Phone: <span className="text-slate-900 font-medium">{record.candidatePhone || 'N/A'}</span></span>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded border border-slate-100 relative overflow-hidden group">
              <Brain className="absolute -right-4 -bottom-4 w-16 h-16 text-blue-200/50 group-hover:scale-110 group-hover:text-blue-200 transition-all duration-300" />
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5"><Brain className="w-4 h-4 text-blue-500" /> Mindset</div>
              <div className="text-xl font-bold text-slate-900 mt-2 relative z-10">{scoreInfo?.sec3 || 0} / 30</div>
            </div>
            <div className="p-4 bg-slate-50 rounded border border-slate-100 relative overflow-hidden group">
              <ShieldCheck className="absolute -right-4 -bottom-4 w-16 h-16 text-purple-200/50 group-hover:scale-110 group-hover:text-purple-200 transition-all duration-300" />
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-purple-500" /> Honesty & Character</div>
              <div className="text-xl font-bold text-slate-900 mt-2 relative z-10">{scoreInfo?.sec4 || 0} / 20</div>
            </div>
            <div className="p-4 bg-slate-50 rounded border border-slate-100 relative overflow-hidden group">
              <Target className="absolute -right-4 -bottom-4 w-16 h-16 text-green-200/50 group-hover:scale-110 group-hover:text-green-200 transition-all duration-300" />
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5"><Target className="w-4 h-4 text-green-500" /> Coachability</div>
              <div className="text-xl font-bold text-slate-900 mt-2 relative z-10">{scoreInfo?.sec6 || 0} / 15</div>
            </div>
            <div className="p-4 bg-slate-50 rounded border border-slate-100 relative overflow-hidden group">
               <MessageSquare className="absolute -right-4 -bottom-4 w-16 h-16 text-rose-200/50 group-hover:scale-110 group-hover:text-rose-200 transition-all duration-300" />
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-rose-500" /> Comm / Roleplay</div>
              <div className="text-xl font-bold text-slate-900 mt-2 relative z-10">{scoreInfo?.sec7 || 0} / 15</div>
            </div>
        </div>

        {(scoreInfo?.isMindsetFail || (scoreInfo?.autoFails && scoreInfo.autoFails.length > 0)) && (
          <div className="mb-8 space-y-3">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logged Flags & Warnings</h4>
             {scoreInfo?.isMindsetFail && (
                <div className="flex items-start p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 text-red-500" />
                  High Quit Risk: Mindset score below 22.
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
             {sections.map(sec => {
               // Only show sections with questions
               if (!sec.questions || sec.questions.length === 0) return null;
               
               // Check if any answers exist for this section
               const hasAnswers = sec.questions.some(q => record.answers[q.id] !== undefined && record.answers[q.id] !== '');
               if (!hasAnswers) return null;

               return (
                 <div key={sec.id} className="space-y-4">
                   <h4 className="text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-400" /> {sec.title}</h4>
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

                       return (
                         <div key={q.id}>
                           <div className="text-xs text-slate-500 font-bold mb-1">{q.text}</div>
                           <div className="text-sm text-slate-900 font-medium bg-white p-3 rounded border border-slate-200">
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
