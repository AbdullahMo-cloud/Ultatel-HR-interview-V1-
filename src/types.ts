export type QuestionType = 'choice' | 'text' | 'rating' | 'yes_no';

export interface RatingOption {
  points: number;
  label: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[] | RatingOption[];
  clarification?: string;
}

export interface SectionDef {
  id: string;
  title: string;
  description?: string;
  weight?: number;
  questions: Question[];
  roleplayScript?: string[];
  isInformational?: boolean;
}

export interface EvaluationRecord {
  id: string;
  date: string;
  interviewerName: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateSite?: string;
  answers: Record<string, any>;
  scoreInfo: any;
}

