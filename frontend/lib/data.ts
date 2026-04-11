export type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  criteria: string;
};

export const tasks: Task[] = [
  {
    id: "design-sprint",
    title: "Design a clean landing page",
    description:
      "Create a responsive landing page for a fintech app. Focus on a strong hero section, trust indicators, and a clear call to action.",
    reward: 250,
    criteria: "Deliver a Figma file with desktop + mobile frames and a simple style guide.",
  },
  {
    id: "prompt-library",
    title: "Curate AI prompt library",
    description:
      "Build a set of reusable prompts for customer support replies. Include templates for refunds, shipping delays, and troubleshooting.",
    reward: 140,
    criteria: "Provide 12 prompts with placeholders and brief usage notes.",
  },
  {
    id: "data-audit",
    title: "Audit CSV data quality",
    description:
      "Review a CSV export for missing values, duplicates, and inconsistent formatting. Provide a summary and suggested fixes.",
    reward: 180,
    criteria: "Share a bullet list of issues and a cleaned sample of 20 rows.",
  },
];
