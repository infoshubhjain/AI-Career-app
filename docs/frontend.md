# Frontend Documentation

> AI Career App - Next.js Frontend Documentation

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Routes](#routes)
- [Components](#components)
- [Styling](#styling)
- [Error Handling](#error-handling)

---

## Overview

The frontend is built with **Next.js 15** using the App Router, **React 18**, **TypeScript**, and **Tailwind CSS**. It provides a career learning path application where users can select career goals and track their learning progress.

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.0 | React framework with App Router |
| React | 18.3.1 | UI library |
| TypeScript | 5.7.2 | Type safety |
| Tailwind CSS | 3.4.17 | Utility-first CSS |
| PostCSS | 8.4.49 | CSS processing |

---

## Project Structure

```
frontend/
├── app/
│   ├── components/          # Reusable UI components
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── index.ts
│   ├── globals.css          # Global styles & CSS variables
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── loading.tsx          # Global loading state
│   ├── error.tsx            # Global error boundary
│   └── not-found.tsx        # 404 page
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Routes

### Home Page

| Property | Value |
|----------|-------|
| **Path** | `/` |
| **File** | `app/page.tsx` |
| **Type** | Client Component |

**Description:**  
Landing page where users enter their desired career goal.

**Features:**
- Text input for career goal entry
- Form validation (disables submit when empty)
- Console logging on submit (extend for navigation/API calls)

**State:**
```typescript
const [futureGoal, setFutureGoal] = useState("");
```

---

## Components

All UI components are located in `app/components/ui/` and exported via `index.ts`.

### Button

**File:** `app/components/ui/Button.tsx`

**Import:**
```typescript
import { Button } from "@/app/components/ui";
```

**Props:**
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}
```

**Variants:**
| Variant | Description |
|---------|-------------|
| `primary` | Dark background, light text (default) |
| `secondary` | Light background, dark text |
| `outline` | Bordered, transparent background |
| `ghost` | No background, text only |

**Sizes:**
| Size | Padding |
|------|---------|
| `sm` | `px-3 py-1.5` |
| `md` | `px-4 py-2` (default) |
| `lg` | `px-6 py-3` |

**Usage:**
```tsx
<Button variant="primary" size="lg" isLoading={false}>
  Click Me
</Button>
```

---

### Input

**File:** `app/components/ui/Input.tsx`

**Import:**
```typescript
import { Input } from "@/app/components/ui";
```

**Props:**
```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}
```

**Features:**
- Auto-generated ID from label
- Error state styling
- Helper text support
- Full accessibility support

**Usage:**
```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email address"
/>
```

---

### Card

**File:** `app/components/ui/Card.tsx`

**Import:**
```typescript
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/app/components/ui";
```

**Card Props:**
```typescript
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
}
```

**Variants:**
| Variant | Description |
|---------|-------------|
| `default` | Plain white/dark background |
| `bordered` | With border |
| `elevated` | With shadow |

**Subcomponents:**
| Component | Purpose |
|-----------|---------|
| `CardHeader` | Container for title and description |
| `CardTitle` | Card heading (h3) |
| `CardDescription` | Muted description text |
| `CardContent` | Main content area |
| `CardFooter` | Footer with actions |

**Usage:**
```tsx
<Card variant="bordered">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description here</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Styling

### CSS Variables

Defined in `app/globals.css`:

```css
:root {
  --background: #fafafa;
  --foreground: #0a0a0a;
  --muted: #737373;
  --muted-foreground: #a3a3a3;
  --border: #e5e5e5;
  --ring: #0a0a0a;
  --primary: #0a0a0a;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #0a0a0a;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

Dark mode variables are automatically applied via `@media (prefers-color-scheme: dark)`.

---

### Animation Classes

| Class | Effect |
|-------|--------|
| `animate-fade-in` | Fade in |
| `animate-fade-in-up` | Fade in from below |
| `animate-fade-in-down` | Fade in from above |
| `animate-slide-in-left` | Slide in from left |
| `animate-slide-in-right` | Slide in from right |
| `animate-scale-in` | Scale in |
| `animate-shimmer` | Loading shimmer effect |

**Animation Delays:**
| Class | Delay |
|-------|-------|
| `animation-delay-100` | 100ms |
| `animation-delay-200` | 200ms |
| `animation-delay-300` | 300ms |
| `animation-delay-400` | 400ms |
| `animation-delay-500` | 500ms |

---

## Error Handling

### Global Error Boundary

**File:** `app/error.tsx`

Catches runtime errors in the application and displays a user-friendly error page.

**Props:**
```typescript
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
```

**Features:**
- Error icon and message
- "Try again" button (calls `reset()`)
- "Go home" button
- Shows error details in development mode

---

### Global Loading State

**File:** `app/loading.tsx`

Displays a centered loading spinner with "Loading..." text.

---

### 404 Not Found

**File:** `app/not-found.tsx`

Custom 404 page with:
- Large "404" text
- "Page not found" message
- "Back to home" button

---

## Scripts

Run from the `frontend/` directory:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Environment Variables

Currently no environment variables are required. Future integrations may require:

```env
# .env.local (example)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

*Last updated: December 2024*
