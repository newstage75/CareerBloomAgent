export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
};

export type ChatMode = "discover" | "vision";

export type ValueItem = {
  label: string;
  description: string;
  confidence: "high" | "medium" | "low";
};

export type VisionSummary = {
  shortTerm: string;
  midTerm: string;
  longTerm: string;
};

export type ListItem = {
  id: string;
  text: string;
};

export type UserInsights = {
  values: ValueItem[];
  vision: VisionSummary;
  strengths: string[];
  themes: string[];
  bucketList: ListItem[];
  neverList: ListItem[];
};

export type JourneyStep = {
  label: string;
  description: string;
  completed: boolean;
};

export type ValueChangeCategory = "discovered" | "strengthened" | "shifted" | "vision_updated";

export type ValueChangeEntry = {
  id: string;
  date: string;
  category: ValueChangeCategory;
  title: string;
  description: string;
  source: ChatMode | null;
};

export type SkillResponse = {
  id: string;
  name: string;
  level: string;
  created_at: string;
};

export type ValueAlignment = {
  summary: string;
  score: number;
};

export type MatchResult = {
  id: string;
  company: string;
  position: string;
  score: number;
  tags: string[];
  gap_skills: string[];
  value_alignment: ValueAlignment | null;
  calculated_at: string;
};

export type JourneyProgress = {
  discover_completed: boolean;
  vision_completed: boolean;
  insights_generated: boolean;
};

export type DashboardData = {
  skills_count: number;
  top_match_score: number;
  chat_sessions_count: number;
  journey: JourneyProgress;
  recent_skills: SkillResponse[];
  top_matches: MatchResult[];
};
