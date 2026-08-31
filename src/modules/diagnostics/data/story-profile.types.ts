export interface StoryProfileContext {
  name: string;
  isCollege: boolean;
  classGroup: string | null;
  classGroupLabel: string | null;
  stream?: string | null;
  board?: string | null;
  school?: string | null;
  country?: string | null;
  city?: string | null;
  grade?: number | null;
  targetDegree?: string | null;
  targetCountries?: string[];
  subjects?: string[];
  cgpa?: number;
  percentage?: number | null;
  hasTranscript?: boolean;
  transcriptProgram?: string;
  resumeSummary?: string | null;
  interests?: string[];
}
