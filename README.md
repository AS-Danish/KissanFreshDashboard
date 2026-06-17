<div align="center">
  <img src="public/favicon.ico" alt="Kissan Fresh Admin Logo" width="120" />

  # 🛠️ Kissan Fresh - Admin Control Panel
  
  **The Mission Control for E-commerce & Delivery Logistics.**

  [![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React_19-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)](#)
  [![Algolia](https://img.shields.io/badge/Algolia-Search-%235468FF?style=for-the-badge&logo=algolia&logoColor=white)](#)
  
  *A high-performance, secure, and intuitive web portal built to manage orders, catalog inventory, fleet logistics, and analytics for the Kissan Fresh ecosystem.*
</div>

---

## 📖 Overview

The **Kissan Fresh Admin Dashboard** is the backbone of the consumer operations. Engineered from the ground up using cutting-edge web technologies like **Next.js 16** and **React 19**, this web application enables administrators to visualize business metrics, manage a fleet of delivery riders, monitor real-time order statuses, and instantly update catalog inventories.

> **Note:** This repository serves as a portfolio piece showcasing frontend architecture, modern UI/UX implementation, and robust state management. Secure Firebase credentials, Algolia API keys, and proprietary cloud functions are fully obfuscated to protect the integrity of the live product.

---

## ✨ Core Modules & Functionality

### 📊 Business Analytics & Reporting
- **Data Visualization:** Built with **Recharts**, presenting real-time graphs and KPIs for sales, user growth, and logistics efficiency.
- **Data Exports:** Automated Excel file generation (`xlsx`) for offline record keeping and accounting.
- **Instant Printing:** Built-in PDF/print support (`react-to-print`) for manifests and invoices.

### 🚚 Logistics & Fleet Management
- **Rider Allocation:** Dynamic assignment interface utilizing **@dnd-kit** for a smooth, drag-and-drop experience when assigning riders to deliveries.
- **Slot Management:** Comprehensive interface to monitor, lock, and assign capacities to delivery time slots in real-time.

### 🗃️ Content & Catalog Management
- **Blazing Fast Search:** Fully integrated **Algolia Search** with automated synchronization scripts (`sync-algolia.mjs`), allowing instant, typo-tolerant catalog filtering.
- **Advanced Data Tables:** Highly interactive and sortable data grids powered by **TanStack Table**.
- **Media Optimization:** Client-side image compression (`browser-image-compression`) to reduce server payload and storage costs when uploading product imagery.

### 🎨 State-of-the-Art UI/UX
- **Design System:** Constructed with **Tailwind CSS v4** and **shadcn/ui** for accessible, headless, and strictly typed components.
- **Theming:** Seamless Light/Dark mode switching via `next-themes`.
- **Fluid Animations:** Micro-interactions and toast notifications powered by `vaul` and `sonner` for a polished, app-like feel.

---

## 🛠️ Technology Stack

| Architecture Layer | Technology Used | Purpose |
|--------------------|-----------------|---------|
| **Core Framework** | Next.js 16 (App Router) | Server-side rendering, routing, and API endpoints |
| **UI Library** | React 19 | Component-based view layer |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui | Utility-first styling and headless UI primitives |
| **Global State** | Zustand | Lightweight, high-performance state management |
| **Database/Auth** | Firebase / Firebase Admin | Real-time NoSQL operations and admin privileges |
| **Search Engine** | Algolia | Instant, faceted search for large datasets |
| **Data Validation** | Zod | Strict schema validation for forms and API payloads |

---

## 📸 Dashboard Sneak Peek

*(Below are placeholders. Please replace the `src` links with actual screenshots or GIFs of your Admin Dashboard!)*

<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Analytics+Overview" width="48%" />
  <img src="https://via.placeholder.com/800x450.png?text=Rider+Management+(Drag+&+Drop)" width="48%" />
  <br/><br/>
  <img src="https://via.placeholder.com/800x450.png?text=Slot+Management+Interface" width="48%" />
  <img src="https://via.placeholder.com/800x450.png?text=Catalog+&+Algolia+Search" width="48%" />
</div>

---

## 🚀 Architectural Highlights

- **Server/Client Synergy:** Leveraging Next.js Server Components for heavy data fetching (Firebase Admin) while keeping client-side interactivity fast and lightweight.
- **Automated Indexing:** Custom Node.js scripts (`sync-algolia.mjs`) automatically keep the Firestore database and Algolia search index perfectly aligned.
- **Type-Safe Ecosystem:** Utilizing `zod` for robust end-to-end type safety, from user input validation to API response parsing.
- **Scalable State:** Moving away from heavy boilerplate (like Redux) in favor of **Zustand**, allowing decoupled and highly performant state stores.

---

<div align="center">
  <i>Empowering Logistics with Next.js 🚀</i>
</div>
