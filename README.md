# 🍳 JustCook — Tactile Kitchen Pantry Chef

A tactile, visual, zero-waste kitchen pantry manager and culinary companion built with **Next.js 16**, **React 19**, **Prisma ORM**, **Tailwind CSS v4**, and **Framer Motion**.

JustCook replaces boring spreadsheets and static inventory lists with an interactive, sensory kitchen workbench: drag food sprites across your cutting board, chop items directly into the sizzle pan with synthesized audio feedback, track ingredient shelf-life with precision culinary fractions, and package your entire kitchen setup into portable `.zip` archives with raw asset preservation.

---

## ✨ Key Features

### 1. 🥑 Tactile Shelf Tray & Visual Physics
* **Physics-based Drag & Drop**: Every egg, cabbage, and noodle portion is an interactive visual sprite powered by Framer Motion spring physics.
* **Fractional Culinary Slicing**: Slices items into culinary units (½, ⅓, ¼, ⅛) with visual knife-cut line indicators.
* **Spice Gauge Fill Levels**: Glass spice jars feature real-time liquid/powder fill meters based on stock quantities.

### 2. 🔥 Interactive Sizzle Pan & Cooking Station
* **Synthesized Audio Engine**: Zero external audio files! Sounds are synthesized on the fly via the native browser Web Audio API:
  * White noise + bandpass filter sizzling cooking pan.
  * Dual-triangle oscillator knife chop impact.
  * Sine 880Hz kitchen completion chime.
* **Mobile Haptics**: Uses the Navigator Vibration API for sensory feedback on taps, chops, and transfers.

### 3. ⏱️ Smart Shelf-Life & Freshness Engine
* **USDA FoodKeeper Guidelines**: Intelligent expiration estimates based on storage zones (Fridge, Freezer, Cupboard, Counter).
* **Color-Coded Freshness Badges**: Instant status at a glance (`Fresh`, `Use Soon`, `Expiring Today`, `Overdue`).
* **Multi-Batch Tracking**: Separate purchase dates, quantities, and locations for the same ingredient.

### 4. 💾 Save & Load System with Raw Binary Asset Preservation
* **Inspectable `.zip` Archives**: Backups are standard ZIP files containing a clean `kitchen.json` manifest and your actual raw PNG image files as-is in `assets/food/`. You can open and edit images in Finder/Photoshop anytime.
* **Automatic Unpacker / Decoder**: Decodes archives, validates against Zip-Slip path traversal, extracts raw binary files to disk, and refreshes the database in an atomic transaction.
* **Browser Save Slots**: Quick snapshot bookmarks stored locally via **IndexedDB** with no 5MB quota restrictions.
* **1-Tap Starter Presets**: Asian Sizzle & Stir-Fry, Italian Trattoria, Weekend Brunch, or Clean Slate.

### 5. 🎨 In-Browser Auto Background Removal
* Built-in Canvas 2D color-distance algorithm removes solid backgrounds from uploaded photos or web images, producing transparent sprites directly in the browser without any third-party paid APIs.

### 6. 🏆 Zero-Waste Impact & Trophies
* Tracks dollars saved, kilograms of food rescued from the landfill, and carbon emissions avoided.
* Unlocks culinary achievement trophies as you cook through expiring ingredients.

---

## 🛠️ Tech Stack & Credits

* **Framework**: [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, Route Handlers)
* **Frontend**: [React 19.3.0](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
* **Database & ORM**: [Prisma ORM 6](https://www.prisma.io/), [SQLite](https://www.sqlite.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Animations**: [Framer Motion 14](https://motion.dev/)
* **Iconography**: [Lucide Icons](https://lucide.dev/)
* **Archive Compression**: [JSZip](https://stuk.github.io/jszip/)
* **Sound & Haptics**: Web Audio API & Navigator Vibration API
* **External Recipes**: [TheMealDB](https://www.themealdb.com/)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.18 or higher (v20+ recommended)
* **npm**, **yarn**, or **pnpm**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/danz-the-penguin/justcook.git
   cd justcook
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**:
   ```bash
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Mobile Access (Local Network & Tunnel)

To test on your mobile phone or tablet on the same Wi-Fi network:
```bash
# Allow Next.js dev server on your local IP
npm run dev -- -H 0.0.0.0
```
Open `http://<YOUR_LOCAL_IP>:3000` on your phone browser.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
