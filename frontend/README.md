# Minitia frontend

Next.js frontend for the Minitia proof-of-work task marketplace: browsing, creation, and submission against the backend API.

## Pages

- Home: task marketplace
- Create Task: AI-generate task structure, then create task via backend
- Task Detail: task description and reward
- Submit Work: submission form posted to backend

## Project Structure

- app/page.tsx
- app/create/page.tsx
- app/task/[id]/page.tsx
- app/submit/[id]/page.tsx
- components/TaskCard.tsx
- components/Navbar.tsx
- lib/data.ts
- lib/api.ts
- lib/types.ts

## Environment

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
