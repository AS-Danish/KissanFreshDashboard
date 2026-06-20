# KissanFresh Dashboard Technical Specifications

This document outlines the technical details, UI/UX architecture, component structure, configuration, and workflow of the KissanFresh Dashboard project.

## 1. Tech Stack Overview

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + native CSS custom properties
- **Components**: shadcn/ui, Radix UI, Lucide React, Tabler Icons
- **State Management**: Zustand
- **Database/Backend**: Firebase & Firebase Admin
- **Animations**: Framer Motion (Landing Page), tw-animate-css
- **Charts**: Recharts
- **Forms/Validation**: Zod
- **Search**: Algolia

## 2. Global Theme & Color Configuration

The project utilizes a custom, heavily themed design system spanning light and dark modes defined in `src/app/theme.css`.

### Light Mode (Root Variables)
- **Background**: `#f7fbfd` (Very Light Tint)
- **Foreground (Text)**: `#00182a` (Navy)
- **Primary**: `#003c6c` (Navy Blue)
- **Secondary**: `#056641` (Bottle Green)
- **Accent**: `#cfeddc` (Light Bottle Green)
- **Muted**: `#e3f1fb`
- **Sidebar**: `#eaf7ff` (Tinted Navy BG)

### Dark Mode (`.dark` Variables)
- **Background**: `#031222` (Deep Navy)
- **Foreground (Text)**: `#e5f0fc` (Off-white Tinted Navy)
- **Primary**: `#3a93e6` (Bright Navy/Blue)
- **Secondary**: `#2b9667` (Vibrant Bottle Green)
- **Accent**: `#04321e` (Dark Bottle Green)
- **Muted**: `#122334`
- **Sidebar**: `#031222`

## 3. Architecture & Project Structure

The codebase is organized in the `src/` directory with standard Next.js App Router conventions:

- `src/app`: Contains the routing logic.
  - `/`: Landing Page (Home)
  - `/login`: Authentication flow
  - `/dashboard`: Main administrative dashboard layout
  - `/privacy`, `/delete-account`: Auxiliary pages
- `src/components`: UI components, organized by domain.
  - `/landing`: Components specific to the landing page (`landing-nav.jsx`, `landing-hero.jsx`, etc.)
- `src/firebase`: Firebase client and admin configurations.
- `src/hooks`: Custom React hooks.
- `src/lib`: Utility functions and generalized helpers.
- `src/services`: API service layers and external integrations.
- `src/store`: Zustand stores for global state management.

## 4. Landing Page Flow & UI/UX

The landing page follows a modern SaaS/E-commerce flow optimized for conversion, animated smoothly using Framer Motion.

### Components
1. **LandingNav**: Fixed navigation with the KissanFresh logo, Quick links, Theme Toggle, and a CTA to download the app/login.
2. **LandingHero**: A visually impactful opening section with stagger text animations, dynamic floating order card, and direct CTAs to "Download the App" and the "Dashboard".
3. **LandingFeatures**: Scroll-triggered animated cards outlining the core value propositions (Farm Fresh, Fast Delivery, Quality Assured, etc.).
4. **LandingShowcase**: A dynamic layout to showcase top products, farm-to-table flow, or user testimonials with hover states.
5. **LandingFooter**: Organized links, social connections, and copyright information.

### UX Features
- **Theme Toggling**: Smooth transition between light and dark modes.
- **Scroll Animations**: Elements fade in and slide up as they enter the viewport.
- **Micro-interactions**: Hover effects on buttons, scalable cards, and interactive navigation elements.

## 5. Dashboard Configuration

The dashboard operates via Next.js server/client components seamlessly handling data fetching from Firebase and visualizing through Recharts.

- **Data Flow**: `Firebase -> Services -> Zustand Store -> Next.js Components`
- **Routing**: Client-side navigation wrapper combined with Next.js pre-fetching.

This document serves as the master reference for the dashboard ecosystem.
