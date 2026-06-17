import React, { useState } from 'react';
import { SectionDef, Question, RatingOption } from './types';
import { Plus, Trash, Edit3, Settings, Save, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  sections: SectionDef[];
  onSave: (sections: SectionDef[]) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  showAlert?: (title: string, message: string, type?: 'alert' | 'success') => void;
}

export default function AdminPanelView({ sections: initialSections, onSave, showConfirm, showAlert }: Props) {
  const [sections, setSections] = useState<SectionDef[]>(JSON.parse(JSON.stringify(initialSections)));
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleAddSection = () => {
    const newSection: SectionDef = {
      id: `sec_${Date.now()}`,
      title: 'New Section',
      description: '',
      weight: 10,
      questions: []
    };
    setSections([...sections, newSection]);
    setExpandedSection(newSection.id);
  };

  const handleDeleteSection = (id: string) => {
    if (showConfirm) {
      showConfirm("Delete Section", "Are you sure you want to delete this section?", () => {
        setSections(sections.filter(s => s.id !== id));
      });
    } else {
      if (confirm("Are you sure you want to delete this section?")) {
        setSections(sections.filter(s => s.id !== id));
      }
    }
  };

  const updateSection = (id: string, updates: Partial<SectionDef>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAddQuestion = (sectionId: string, type: 'choice' | 'rating' | 'text' | 'yesno') => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text: 'New Question',
      type: type === 'yesno' ? 'choice' : type,
      optional: false,
      ...(type === 'rating' ? {
        options: [
          { points: 5, label: "Strong", text: "Excellent answer" },
          { points: 3, label: "Average", text: "Good answer" },
          { points: 1, label: "Weak", text: "Poor answer" }
        ]
      } : type === 'choice' ? { options: ["Option 1", "Option 2"] } : type === 'yesno' ? { options: ["Yes", "No", "Maybe"] } : {})
    };
    
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, questions: [...s.questions, newQuestion] };
      }
      return s;
    }));
  };

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<Question>) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q)
        };
      }
      return s;
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    if (showConfirm) {
      showConfirm("Delete Question", "Are you sure you want to delete this question?", () => {
        setSections(sections.map(s => {
          if (s.id === sectionId) {
            return { ...s, questions: s.questions.filter(q => q.id !== questionId) };
          }
          return s;
        }));
      });
    } else {
      if (confirm("Are you sure you want to delete this question?")) {
        setSections(sections.map(s => {
          if (s.id === sectionId) {
            return { ...s, questions: s.questions.filter(q => q.id !== questionId) };
          }
          return s;
        }));
      }
    }
  };

  const handleSave = () => {
    onSave(sections);
    if (showAlert) {
      showAlert('Success', 'Form template saved successfully!', 'success');
    } else {
      alert('Form template saved successfully!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900">Form Template Editor</h2>
          <p className="text-sm text-slate-500 mt-1">Manage sections, disclaimers, and questions for the evaluation form.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-lg shadow-sm hover:bg-brand-blue-light transition-all"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={section.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="px-6 py-4 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <div className="flex-1">
                <input 
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 text-lg w-full"
                  placeholder="Section Title"
                />
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
                {expandedSection === section.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </div>

            {expandedSection === section.id && (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Disclaimer / Description</label>
                  <textarea 
                    value={section.description || ''}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[80px]"
                    placeholder="Provide context or instructions for this section..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Questions</label>
                  {section.questions.map((q, qIndex) => (
                    <div key={q.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                      <button 
                        onClick={() => deleteQuestion(section.id, q.id)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                      <div className="pr-10">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Question Text</label>
                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => updateQuestion(section.id, q.id, { text: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded focus:border-brand-blue outline-none text-sm"
                            />
                          </div>
                          <div className="w-32 pt-5">
                            <label className="flex items-center gap-2 text-sm cursor-pointer border p-1.5 rounded bg-white">
                              <input 
                                type="checkbox"
                                checked={!q.optional}
                                onChange={(e) => updateQuestion(section.id, q.id, { optional: !e.target.checked })}
                                className="w-4 h-4 text-brand-blue border-slate-300 rounded focus:ring-brand-blue"
                              />
                              <span className="font-bold text-slate-600">Required</span>
                            </label>
                          </div>
                        </div>
                        
                        {q.type === 'rating' && (
                          <div className="space-y-3 mt-4">
                            <label className="block text-xs font-medium text-slate-500">Rating Options & Points</label>
                            {((q.options as RatingOption[]) || []).map((opt, oIndex) => (
                              <div key={oIndex} className="flex gap-2 items-start">
                                <input
                                  type="number"
                                  value={opt.points}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options as RatingOption[])];
                                    newOpts[oIndex] = { ...newOpts[oIndex], points: parseInt(e.target.value) || 0 };
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm"
                                  placeholder="Pts"
                                />
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options as RatingOption[])];
                                    newOpts[oIndex] = { ...newOpts[oIndex], label: e.target.value };
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="w-32 px-2 py-1.5 border border-slate-200 rounded text-sm"
                                  placeholder="Label"
                                />
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options as RatingOption[])];
                                    newOpts[oIndex] = { ...newOpts[oIndex], text: e.target.value };
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                                  placeholder="Description..."
                                />
                                <button
                                  onClick={(e) => {
                                    const newOpts = [...(q.options as RatingOption[])];
                                    newOpts.splice(oIndex, 1);
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-500 mt-0.5"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOpts = [...((q.options as RatingOption[]) || []), { points: 0, label: 'New', text: '' }];
                                updateQuestion(section.id, q.id, { options: newOpts });
                              }}
                              className="text-xs font-bold text-brand-blue hover:text-brand-blue-light"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}

                        {q.type === 'choice' && (
                          <div className="space-y-3 mt-4">
                            <label className="block text-xs font-medium text-slate-500">Choice Options</label>
                            {((q.options as string[]) || []).map((opt, oIndex) => (
                              <div key={oIndex} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options as string[])];
                                    newOpts[oIndex] = e.target.value;
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                                  placeholder="Option text..."
                                />
                                <button
                                  onClick={(e) => {
                                    const newOpts = [...(q.options as string[])];
                                    newOpts.splice(oIndex, 1);
                                    updateQuestion(section.id, q.id, { options: newOpts });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-500"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOpts = [...((q.options as string[]) || []), 'New Option'];
                                updateQuestion(section.id, q.id, { options: newOpts });
                              }}
                              className="text-xs font-bold text-brand-blue hover:text-brand-blue-light"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={() => handleAddQuestion(section.id, 'choice')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Choice Question
                    </button>
                    <button 
                      onClick={() => handleAddQuestion(section.id, 'yesno')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Yes / No / Maybe Question
                    </button>
                    <button 
                      onClick={() => handleAddQuestion(section.id, 'rating')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Rating Question
                    </button>
                    <button 
                      onClick={() => handleAddQuestion(section.id, 'text')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Text Question
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={handleAddSection}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:bg-slate-100 hover:border-slate-400 transition-all"
      >
        <Plus className="w-5 h-5" />
        Add New Section
      </button>
    </div>
  );
}

const XCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
