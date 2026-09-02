# Full-Stack AI Dashboard & Landing Page for Booking system for University Facilities

A complete full-stack application featuring a data-driven dashboard, conversion-optimized landing page, a unified design system, and multi-tenant database schema built for seamless interaction with Claude AI.

## 🛠️ Tech Stack

### Frontend & Backend & AI
- **Framework:** Tanstack start
- **Styling:** Tailwind CSS
- **Components:** Shadcn UI + Radix Primitives
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Runtime:** Tanstack Node.js Runtime
- **Framework:** Hono
- **AI Integration:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`)
- **Database:** MySQL
- **ORM:** Prisma ORM
- **Authentication:**  Better-auth (google)
- **Email Gateway:** Unosend 

---

## 🎨 Design System

Our design system focuses on clean typography, accessible contrast, and smooth AI interaction states.

### Core Tokens
- **Primary:** `bg-blue-950`
- **Accent:** `bg-red-100` 
- **Background:** `#F8FAFC` (Slate 50)
- **Radius:** `0.5rem` (Standard component rounding)

### Claude AI Guidelines
- Use **Shadcn UI** conventions for custom components.
- Ensure all elements support **Dark Mode** using Tailwind `dark:` utilities.
- Implement **accessible names** (`aria-label`) on icon-only buttons.

---

## 🖥️ Application Structure

### 1.  Landing Page or Website For Visitors (web)
- **Homepage:** Main landing page with facilities or bookable items, Timeline of paid bookings showing on a calendar. Clear Call-to-Action (CTA).
- **Signup page:** On-boarding page to help Customers signup before make a booking request.Signup is with google authentication only and require customer to fill certain information like their organisation if any, their phone numbers and contact persons.
- **Signin page:** Allows customers to signin to the system. 
- **customer dashboard page:** Grid dashboard layouts with charts showing requests counts, payment history, booking request history and countdown to booked requests. Recharts integration for predictive analytics.
- **customer invoice & receipt pages:** Nice invoice and receipting page for print. Responsive Grid layout.
- **customer booking request page:** Nice datatable using tanstack table with custom beautiful ui.

### 2. Admin Portal Dashboard (admin)
- **Admin Dashboard page:** Universal metrics dashboard with charts,predictive analytics and summaries.
- **Clients Page:** Nice datable with tanstack table for client.
- **Items & Facilities Page:**  Nice datable with tanstack table for items, addons, facilities.
- **Booking Requests Page:** Recharts integration for predictive analytics.
- **Payments Page:**  Nice datable with tanstack table for payments.
- **Receivers Page:**  Nice datable with tanstack table for receivers.

---

## 📁 Directory Structure

```text
├── apps/
│   ├── web/                # tanstack Frontend (Landing page Website)
|   ├── admin/               # tanstack Frontend (Admin Portal)
│   └── api/                # Hono Backend (AI Agents & Data)
├── packages/
│   ├── ui/                 # Shared Design System Components
│   └── tsconfig/           # Shared TypeScript Configurations
└── README.md
```

---

## 🗄️ Database Schema (Prisma ORM)
- Use the  prisma schema shared by other live applications in the upload/schema.prisma.
- 

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
   DATABASE_URL="mysql://root:xxxxxxx@localhost:3306/db"
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
