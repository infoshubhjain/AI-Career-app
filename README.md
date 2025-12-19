# AI Career App

A modern career guidance application built with Next.js, React, and Tailwind CSS. The app helps users define their career goals and provides personalized learning paths based on AI-powered recommendations.

## Landing Page

The entry point features a minimal, centered landing page where users can define what they want to become or what skill they want to learn.

## Features

- **Fully responsive** - Works seamlessly on mobile and desktop
- **Modern design** - Clean, neutral aesthetic with dark mode support
- **Accessible** - Semantic HTML with proper ARIA labels
- **Type-safe** - Built with TypeScript
- **Fast** - Optimized with Next.js App Router
- **Minimal dependencies** - Only essential packages included

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 3** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm, yarn, or pnpm package manager

### Installation

1. Navigate to the project directory:
```bash
cd AI-Career-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the landing page.

### Building for Production

```bash
npm run build
npm run start
# or
yarn build
yarn start
# or
pnpm build
pnpm start
```

## Project Structure

```
AI-Career-app/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main landing page component
│   └── globals.css         # Global styles and Tailwind imports
├── public/                 # Static assets (add images, fonts here)
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── postcss.config.mjs      # PostCSS configuration
└── package.json            # Project dependencies
```

## Customization

### Changing Colors

Edit [tailwind.config.ts](tailwind.config.ts) to customize the color palette or modify CSS variables in [app/globals.css](app/globals.css).

### Modifying Content

Edit [app/page.tsx](app/page.tsx) to change:
- Headline text
- Placeholder examples
- Button text
- Form behavior

### Adding Functionality

The `handleSubmit` function in [app/page.tsx](app/page.tsx) currently logs to console and shows an alert. Extend it to:
- Navigate to a new page using Next.js router
- Send data to an API endpoint
- Store in state management (Redux, Zustand, etc.)
- Save to local storage

## Design Decisions

- **System fonts** - Using native font stack for optimal performance
- **Minimal Tailwind** - Only essential utilities, no custom plugins
- **No external dependencies** - No UI component libraries
- **Semantic HTML** - Proper use of main, form, h1, p tags
- **Focus states** - Clear visual feedback for keyboard navigation
- **High contrast** - WCAG AA compliant color combinations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Extensions

Planned features for the AI Career App:

- AI-powered career path recommendations
- Multi-step onboarding flow with skill assessment
- Personalized learning roadmaps
- Integration with learning platforms and resources
- Progress tracking and goal setting
- Community features and mentorship connections
- Resume builder and job matching
- Analytics and insights dashboard
