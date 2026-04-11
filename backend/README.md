# Backend API

Express API for AI task structuring, submission handling, evaluation, and optional smart-contract payout.

## Notes

- Data persistence is file-based for MVP: `backend/data/store.json`
- Restart does not wipe data unless you delete `store.json`
- On-chain payout is optional per task (`fundOnChain`)

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies

```bash
npm install
```

3. Start server

```bash
npm run dev
```

## Environment

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `PORT`
- `CORS_ORIGIN`
- `RPC_URL`
- `CONTRACT_ADDRESS`
- `CONTRACT_PRIVATE_KEY`
- `DEFAULT_REWARD_WEI`
- `DEFAULT_CONTRIBUTOR_WALLET`

## Canonical Task Model

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "reward": 150,
  "criteria": "string",
  "creatorWallet": "string",
  "contributorWallet": "string",
  "onChainTaskId": 1,
  "status": "open|submitted|passed|failed|paid|refunded",
  "createdAt": "timestamp"
}
```

## Endpoints

### POST /tasks/generate

Request:

```json
{
  "description": "Build a responsive React landing page for a crypto project"
}
```

Response:

```json
{
  "title": "Responsive crypto landing page",
  "summary": "Build a modern landing page with responsive sections and wallet CTA.",
  "deliverables": ["Landing page UI", "Wallet button", "Source code"],
  "criteria": "Responsive layout and functional wallet button"
}
```

### POST /tasks

Request:

```json
{
  "title": "Landing page",
  "description": "Build project page",
  "reward": 200,
  "criteria": "Responsive and production-ready",
  "creatorWallet": "",
  "contributorWallet": "",
  "fundOnChain": false,
  "rewardWei": "1000000000000000"
}
```

Response:

```json
{
  "message": "Task created",
  "task": {
    "id": "uuid",
    "title": "Landing page",
    "description": "Build project page",
    "reward": 200,
    "criteria": "Responsive and production-ready",
    "creatorWallet": "",
    "contributorWallet": "",
    "onChainTaskId": null,
    "status": "open",
    "createdAt": "2026-04-11T10:00:00.000Z"
  },
  "payment": {
    "escrowCreated": false
  }
}
```

### GET /tasks

Response:

```json
{
  "tasks": []
}
```

### GET /tasks/:id

Response:

```json
{
  "task": {
    "id": "uuid",
    "title": "Landing page",
    "description": "Build project page",
    "reward": 200,
    "criteria": "Responsive and production-ready",
    "creatorWallet": "",
    "contributorWallet": "",
    "onChainTaskId": null,
    "status": "open",
    "createdAt": "2026-04-11T10:00:00.000Z"
  }
}
```

### POST /submit-work

Request:

```json
{
  "taskId": "uuid",
  "submissionText": "Delivered all sections and wallet integration",
  "submissionLink": "https://example.com",
  "contributorWallet": ""
}
```

Response:

```json
{
  "message": "Submission successful",
  "submission": {
    "id": "uuid",
    "taskId": "uuid",
    "submissionText": "Delivered all sections and wallet integration",
    "submissionLink": "https://example.com",
    "status": "pending",
    "createdAt": "2026-04-11T10:00:00.000Z"
  }
}
```

### POST /evaluate-submission

Request:

```json
{
  "taskId": "uuid",
  "submissionId": "uuid"
}
```

Response:

```json
{
  "taskId": "uuid",
  "submissionId": "uuid",
  "verdict": "PASS",
  "score": 9,
  "reason": "Submission meets required criteria",
  "feedback": {
    "metCriteria": ["Responsive layout"],
    "missingCriteria": [],
    "improvements": ["Add accessibility notes"]
  },
  "payment": {
    "attempted": true,
    "success": true,
    "txHash": "0x123",
    "error": null
  }
}
```

### POST /tasks/:id/refund

Response:

```json
{
  "message": "Refund successful",
  "task": {
    "id": "uuid",
    "status": "refunded"
  },
  "payment": {
    "txHash": "0xabc"
  }
}
```

### GET /submissions

Response:

```json
{
  "submissions": []
}
```
