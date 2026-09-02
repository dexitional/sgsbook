# Full-Stack AI Dashboard & Landing Page for Booking system University Facilities

A complete full-stack boilerplate architecture featuring a data-driven dashboard, conversion-optimized landing page, a unified design system, and multi-tenant database schema built for seamless interaction with Claude AI.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Tanstack start
- **Styling:** Tailwind CSS
- **Components:** Shadcn UI + Radix Primitives
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)

### Backend & AI
- **Runtime:** Tanstack Node.js Runtime
- **Framework:** Hono
- **AI Integration:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`)
- **Database:** MySQL
- **ORM:** Prisma ORM

---

## 🎨 Design System

Our design system focuses on clean typography, accessible contrast, and smooth AI interaction states.

### Core Tokens
- **Primary:** `#0F172A` (Slate 900)
- **Accent:** `#7C3AED` (Violet 600)
- **Background:** `#F8FAFC` (Slate 50)
- **Radius:** `0.5rem` (Standard component rounding)

### Claude AI Guidelines
- Use **Shadcn UI** conventions for custom components.
- Ensure all elements support **Dark Mode** using Tailwind `dark:` utilities.
- Implement **accessible names** (`aria-label`) on icon-only buttons.

---

## 🖥️ Application Structure

### 1. Landing Page
- **Hero Section:** Value proposition with a clear Call-to-Action (CTA).
- **Features Grid:** Bento-grid style showcasing core AI metrics.
- **Pricing Matrix:** Tiered subscription options with toggle functionality.

### 2. Dashboard
- **Metrics Layout:** CSS Grid displaying key performance indicators (KPIs).
- **AI Playground:** Chat interface integrated with Claude 3.5 Sonnet.
- **Data Visualization:** Recharts integration for predictive analytics.

---

## 📁 Directory Structure

```text
├── apps/
│   ├── web/                # Next.js Frontend (Landing & Dashboard)
│   └── api/                # Hono Backend (AI Agents & Data)
├── packages/
│   ├── ui/                 # Shared Design System Components
│   └── tsconfig/           # Shared TypeScript Configurations
└── README.md
```

---

## 🗄️ Database Schema (Drizzle ORM)

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

// User Profiles Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Organization/Workspace Table for multi-tenancy
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chat Sessions/Conversations
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').default('New Chat').notNull(),
  modelUsed: text('model_used').default('claude-3-5-sonnet').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Message Log (Supports structured tool calls and streaming outputs)
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').$type<'user' | 'assistant' | 'system'>().notNull(),
  content: text('content').notNull(),
  meta: jsonb('meta').$type<{ tokensUsed?: number; speedMs?: number }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI Usage & Rate Limits (To track and limit expensive API calls)
export const usageLimits = pgTable('usage_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  tokenCreditsAllocated: integer('token_credits_allocated').notNull(),
  tokenCreditsUsed: integer('token_credits_used').default(0).notNull(),
  resetAt: timestamp('reset_at').notNull(),
});
```

---

## 🚀 Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env`:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   DATABASE_URL=your_postgres_url
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
