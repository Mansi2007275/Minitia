export type TaskStatus =
  | "open"
  | "submitted"
  | "passed"
  | "failed"
  | "paid"
  | "refunded"
  | "passed_pending"
  | "under_review";

export type DisputeStatus = "none" | "raised" | "resolved";

export type TaskType = "code" | "data" | "generic";

export type ValidationMethod = "tests" | "json_schema" | "api_capture" | "llm_fallback";

export type ContributorTrust = {
  trustScore: number;
  completedVerifiableTasks: number;
};

export type MarketplaceTask = {
  id: string;
  title: string;
  description: string;
  reward: number;
  criteria: string;
  creatorWallet: string;
  contributorWallet: string | null;
  onChainTaskId: number;
  status: TaskStatus;
  createdAt?: string;
  taskType?: TaskType;
  verificationSpec?: Record<string, unknown>;
  disputeStatus?: DisputeStatus;
  disputeReason?: string;
  expectedOutputFormat?: string;
  validationMethod?: ValidationMethod;
  successConditions?: string;
  isVerifiable?: boolean;
  contributorTrust?: ContributorTrust;
};

export type Submission = {
  id: string;
  taskId: string;
  submissionText: string;
  submissionLink: string;
  contributorWallet: string;
  submissionCodeSnippet?: string;
  submissionRepoUrl?: string;
  powTestResults?: string;
  powLogs?: string;
  powOutputFiles?: string;
  status: string;
  createdAt?: string;
  disputeStatus?: DisputeStatus;
  disputeReason?: string;
};

export type StructuredTaskDraft = {
  title: string;
  description: string;
  criteria: string;
  taskType: TaskType;
  validationMethod: ValidationMethod;
  expectedOutputFormat: string;
  successConditions: string;
  suggestedVerificationSpec?: Record<string, unknown>;
};
