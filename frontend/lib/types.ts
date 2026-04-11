export type MarketplaceTask = {
  id: string;
  title: string;
  description: string;
  reward: number;
  criteria: string;
  creatorWallet: string;
  contributorWallet: string;
  onChainTaskId: number | null;
  status: "open" | "submitted" | "passed" | "failed" | "paid" | "refunded";
  createdAt: string;
};

export type Submission = {
  id: string;
  taskId: string;
  submissionText: string;
  submissionLink: string;
  status: string;
  createdAt: string;
};
