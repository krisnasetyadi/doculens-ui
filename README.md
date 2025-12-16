# 🎨 PDF Reader Chat UI / DocuLens (Document Lens)

Frontend application untuk **PDF Reader** dengan AI-powered Q&A system. Dibangun menggunakan Next.js 16 dengan App Router dan shadcn/ui components.

## 🛠️ Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| **Next.js** | 16.0.10 | React framework dengan App Router |
| **React** | 19.2.0 | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.1.9 | Utility-first CSS framework |
| **shadcn/ui** | Latest | Radix UI based components |
| **pdfjs-dist** | 3.11.174 | PDF rendering library |
| **Lucide React** | 0.454.0 | Icon library |

## 📁 Project Structure

```
chat-ui/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout dengan providers
│   ├── page.tsx                 # Main chat page
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── chat-interface.tsx       # Main chat UI dengan message handling
│   ├── pdf-viewer-dialog.tsx    # PDF viewer dengan auto-scroll ke source
│   ├── sidebar.tsx              # Sidebar untuk collections
│   ├── theme-provider.tsx       # Dark/Light mode provider
│   ├── theme-toggle.tsx         # Theme switcher button
│   └── ui/                      # shadcn/ui components (50+ components)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── toast.tsx
│       └── ... (50+ more)
│
├── services/                     # API services
│   ├── endpoint.ts              # API endpoint definitions
│   ├── index.ts                 # Service exports
│   ├── request-handler.ts       # HTTP request handler
│   ├── types.ts                 # TypeScript types
│   └── resources/               # Resource-specific services
│
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions
├── styles/                       # Additional styles
└── public/                       # Static assets
```

## 🎯 Features

### Chat Interface
- 💬 Real-time chat dengan AI responses
- 📝 Message history dengan scroll
- ⌨️ Keyboard shortcuts (Enter to send)
- 🔄 Loading states dengan spinners

### PDF Viewer
- 📄 Fullscreen PDF viewer dialog (98vw x 98vh)
- 🔗 Clickable source links dengan page navigation
- 📍 Auto-scroll ke relevant content
- 🔍 Text highlighting untuk search matches
- 📖 Multi-page navigation

### Collection Management
- 📚 View semua collections
- 📁 Select active collection
- 🔄 Switch between collections

### UI/UX
- 🌙 Dark/Light mode support
- 📱 Responsive design
- ⚡ Fast navigation
- 🎨 Modern UI dengan shadcn/ui

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ atau 20+
- npm, yarn, atau pnpm

### Installation

```bash
# Clone repository (jika belum)
git clone https://github.com/krisnasetyadi/pdf-reader.git

# Masuk ke folder chat-ui
cd chat-ui

# Install dependencies
npm install
# atau
pnpm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local dan set API URL
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
# Run development server (port 3001)
npm run dev

# Build untuk production
npm run build

# Run production server
npm start

# Run linter
npm run lint
```

Buka http://localhost:3001

## ⚙️ Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

### Environment untuk Deployment

**Development (Local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Production (Vercel + HuggingFace)**
```env
NEXT_PUBLIC_API_URL=https://your-space.hf.space
```

## 📱 Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         page.tsx                            │
│    Main page yang render ChatInterface component            │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    chat-interface.tsx                       │
│  ┌───────────────┐  ┌─────────────────────────────────────┐ │
│  │   Sidebar     │  │         Chat Area                   │ │
│  │               │  │  ┌─────────────────────────────┐    │ │
│  │ - Collections │  │  │ Messages                    │    │ │
│  │ - Settings    │  │  │ - User questions            │    │ │
│  │               │  │  │ - AI responses              │    │ │
│  │               │  │  │ - Source links [clickable]  │    │ │
│  │               │  │  └─────────────────────────────┘    │ │
│  │               │  │  ┌─────────────────────────────┐    │ │
│  │               │  │  │ Input Area                  │    │ │
│  │               │  │  │ [Type message...] [Send]    │    │ │
│  │               │  │  └─────────────────────────────┘    │ │
│  └───────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ Click source link
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   pdf-viewer-dialog.tsx                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Dialog (98vw x 98vh)                               │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ PDF Viewer                                  │    │    │
│  │  │                                             │    │    │
│  │  │  Page: [1] of 10    [◄] [►]                │    │    │
│  │  │  ┌─────────────────────────────────────┐   │    │    │
│  │  │  │                                     │   │    │    │
│  │  │  │     PDF Content                     │   │    │    │
│  │  │  │     [highlighted relevant text]     │   │    │    │
│  │  │  │                                     │   │    │    │
│  │  │  └─────────────────────────────────────┘   │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🔗 API Integration

Frontend berkomunikasi dengan backend melalui services:

### Endpoints

```typescript
// services/endpoint.ts
const endpoints = {
  // Collections
  getCollections: '/api/collections',
  getCollection: '/api/collections/:id',
  
  // Query (Chat)
  hybridQuery: '/api/hybrid-query',
  
  // Upload
  uploadPDF: '/api/upload/:collection_id',
  
  // PDF
  getPDF: '/api/pdf/:collection_id/:filename'
}
```

### Request Flow

```
User types question
        │
        ▼
┌─────────────────┐
│ chat-interface  │
│   handleSend()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ request-handler │────▶│   Backend API   │
│   POST /query   │     │ (FastAPI)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ◀───────────────────────┘
         │
         ▼
┌─────────────────┐
│ Display answer  │
│ + source links  │
└─────────────────┘
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Push ke GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Connect ke Vercel**
   - Buka [vercel.com](https://vercel.com)
   - Import repository `chat-ui`
   - Framework: Next.js (auto-detected)

3. **Set Environment Variables**
   - `NEXT_PUBLIC_API_URL` = `https://your-huggingface-space.hf.space`

4. **Deploy**
   - Vercel akan auto-build dan deploy

### Manual Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

## 🎨 Customization

### Theme
Edit `app/globals.css` untuk custom colors:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... more variables */
}
```

### Components
Semua UI components dari shadcn/ui tersedia di `components/ui/`. 
Lihat [shadcn/ui docs](https://ui.shadcn.com) untuk customization.

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## 🔧 Troubleshooting

### PDF tidak bisa di-load
- Pastikan backend berjalan dan accessible
- Check CORS settings di backend
- Pastikan `NEXT_PUBLIC_API_URL` benar

### Dialog terlalu kecil
- Dialog sudah di-set ke 98vw x 98vh dengan inline styles
- Jika masih kecil, check browser zoom level

### Theme tidak berubah
- Pastikan `ThemeProvider` wrap root layout
- Check localStorage untuk saved theme preference

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## 🔗 Related

- [PDF Reader Backend](../pdf-reader/README.md) - FastAPI backend
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Next.js Docs](https://nextjs.org/docs) - Framework documentation
