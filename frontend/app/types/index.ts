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
  starred?: boolean;
};

export type VisionSummary = {
  shortTerm: string;
  midTerm: string;
  longTerm: string;
};

export type ListItem = {
  id: string;
  text: string;
  starred?: boolean;
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

export type ValueChangeCategory = "discovered" | "strengthened" | "shifted" | "vision_updated" | "removed";

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

export type RoadmapStep = {
  title: string;
  description: string;
  duration: string;
};

export type MissingSkill = {
  name: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type TrainingAction = {
  title: string;
  how: string;
  frequency: string;
};

export type YoutubeSuggestion = {
  title: string;
  url: string;
  why: string;
};

export type Roadmap = {
  id: string;
  goal_id?: string;
  goal_text: string;
  goal_summary?: string;
  roadmap?: {
    short_term: RoadmapStep[];
    mid_term: RoadmapStep[];
    long_term: RoadmapStep[];
  };
  missing_skills?: MissingSkill[];
  training_actions?: TrainingAction[];
  youtube_suggestions?: YoutubeSuggestion[];
  generated_at: string;
};

export type JourneyProgress = {
  discover_completed: boolean;
  vision_completed: boolean;
  insights_generated: boolean;
};

export type RecentRoadmap = {
  id: string;
  goal_text: string;
  goal_summary: string;
  generated_at: string;
};

export type DashboardData = {
  skills_count: number;
  roadmaps_count: number;
  chat_sessions_count: number;
  journey: JourneyProgress;
  recent_skills: SkillResponse[];
  recent_roadmaps: RecentRoadmap[];
};
