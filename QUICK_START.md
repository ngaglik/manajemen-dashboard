# Manajemen Dashboard - Quick Start Guide

## Ringkasan
Project **Manajemen Dashboard** telah berhasil dibuat dengan struktur dan pola yang sama seperti project HRIS yang sudah ada. Semua komponen login, routing, dan state management sudah siap untuk digunakan.

## Files yang Dibuat

### Core Files (15 files)
- ✅ `src/App.vue` - Root component template dengan layout (header, sidebar, content)
- ✅ `src/App.ts` - Root component logic dengan auth state machine
- ✅ `src/main.ts` - Entry point aplikasi
- ✅ `src/global.d.ts` - Global type definitions
- ✅ `src/vite-env.d.ts` - Vite environment types

### Components (3 files)
- ✅ `src/components/Login.vue` - Form login dengan validasi
- ✅ `src/components/ProfileBar.vue` - User profile & logout button
- ✅ `src/components/ProfileBar.ts` - ProfileBar logic

### Services (1 file)
- ✅ `src/services/authService.ts` - Authentication & token management

### Router (1 file)
- ✅ `src/router/router.ts` - Vue Router configuration

### Hooks (1 file)
- ✅ `src/hooks/useConfig.ts` - Theme & language configuration

### Constants & Config (2 files)
- ✅ `src/constant/config.ts` - Environment variables wrapper
- ✅ `src/constant/constant.ts` - Menu items & constants

### Locales (1 file)
- ✅ `src/locales/idID.ts` - Indonesian locale

### Pages (1 file)
- ✅ `src/container/dashboard/Dashboard.vue` - Main dashboard page

### Configuration (8 files)
- ✅ `package.json` - Dependencies & npm scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `vite.config.ts` - Vite build configuration
- ✅ `index.html` - HTML entry point
- ✅ `.env` - Development environment variables
- ✅ `.env.example` - Environment template
- ✅ `.gitignore` - Git ignore rules
- ✅ `LICENSE` - MIT License

### Documentation (3 files)
- ✅ `README.md` - Project overview & setup guide
- ✅ `ARCHITECTURE.md` - Detailed architecture guide
- ✅ `QUICK_START.md` - This file

## Struktur Project
```
manajemen-dashboard/
├── src/
│   ├── components/       # Login, ProfileBar
│   ├── constant/         # Config, menu items
│   ├── container/        # Dashboard page
│   ├── hooks/            # useConfig hook
│   ├── locales/          # i18n files
│   ├── router/           # Vue Router setup
│   ├── services/         # Auth service
│   ├── assets/           # Static files (empty)
│   ├── App.vue           # Root template
│   ├── App.ts            # Root logic
│   └── main.ts           # Entry point
├── public/               # Public static files
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── .env                  # Environment config
```

## Setup Awal (5 Langkah)

### 1. Configure Environment
```bash
cd manajemen-dashboard
cp .env.example .env.local
```
Edit `.env.local` dengan configuration backend Anda:
```
VITE_APP_ID=manajemen-dashboard
VITE_BACKEND_URL=http://localhost:3000
VITE_TOKEN_NAME=fd_token
VITE_SESSION_NAME=fd_session
```

### 2. Install Dependencies
```bash
npm install
# atau gunakan pnpm/yarn
pnpm install
```

### 3. Run Development Server
```bash
npm run dev
# Server akan jalan di http://localhost:5173
```

### 4. Access Application
Buka browser ke `http://localhost:5173`

### 5. Login
Gunakan credentials sesuai yang tersimpan di backend Anda

## Key Features

### ✨ Authentication
- Login form dengan validasi
- Token-based authentication
- Logout functionality
- Auth state machine (INIT, CHECKING, AUTH, UNAUTH, ERROR)

### 🎨 UI/UX
- Responsive sidebar navigation
- Mobile-friendly design
- Light/dark theme toggle
- Header dengan user profile

### 🔧 Architecture
- Modular component structure
- Separation of concerns
- TypeScript for type safety
- Environment-based configuration

### 📊 Menu System
- Hierarchical menu support
- Dynamic menu building
- Active menu indicator
- Mobile menu collapse

## Integrasi dengan Backend

### Login Endpoint
Backend harus menyediakan endpoint:
```
POST /api/auth/login
Body: { appid, username, password }
Response: { token, session, employee, ... }
```

### Expected Response Format
```json
{
  "token": "jwt_token_here",
  "session": "session_data",
  "employee": {
    "id": 1,
    "name": "John Doe",
    "tags": ["OSDM"],
    "employee_category_id": 1
  }
}
```

## Commands

```bash
# Development
npm run dev

# Build production
npm run build

# Preview production build
npm run serve

# Type check
npm run type-check (if configured)
```

## Development Tips

### 1. Menambah Halaman Baru
```typescript
// src/container/newpage/NewPage.vue
<template>
  <n-card title="New Page">
    <!-- Konten halaman -->
  </n-card>
</template>
```

```typescript
// Tambah ke src/router/router.ts
import NewPage from "@/container/newpage/NewPage.vue";
// ... di routes array
{ path: "/new-page", component: NewPage }
```

```typescript
// Tambah ke src/constant/constant.ts
{
  label: "New Page",
  key: "/new-page",
}
```

### 2. Mengakses Global Utilities
```typescript
// Di dalam component
window.$message.success("Success!");
window.$dialog.info({ title: "Info", content: "..." });
window.$notification.info({ title: "Notification" });
window.$loadingBar.start();
```

### 3. Menggunakan Auth Data
```typescript
import { getAuthData } from "@/services/authService";

const auth = getAuthData();
console.log(auth.token);        // JWT token
console.log(auth.employee);     // User data
```

### 4. Theme & Language
```typescript
import useConfig from "@/hooks/useConfig";

const { theme, lang, changeTheme, changeLang } = useConfig();
// theme.value: "light" | "dark" | null
// lang.value: { name, label }
```

## Troubleshooting

### Login tidak berhasil
1. Cek `.env` configuration
2. Verifikasi backend URL
3. Check network tab di DevTools
4. Pastikan backend endpoint `/api/auth/login` sudah siap

### Menu tidak muncul
1. Login dulu untuk generate token
2. Check localStorage ada token
3. Verifikasi `getAuthData()` return valid data

### Styling tidak tampil
1. Naive UI memerlukan CSS variables
2. Theme harus di-set dengan benar
3. Clear browser cache

### Build error
1. Verifikasi semua import paths
2. Check TypeScript compilation errors
3. Pastikan node_modules ter-install dengan benar

## Next Steps

1. **Customize Dashboard**: Edit `src/container/dashboard/Dashboard.vue`
2. **Add More Pages**: Buat halaman sesuai requirements
3. **Integrate APIs**: Gunakan `authService` pattern untuk API calls
4. **Add Features**: Financial reports, analysis, budget, dll
5. **Deploy**: Build dan deploy ke production

## Similar Projects
- `/hris` - Human Resource Information System (reference project)

## Support Files
- `README.md` - Detailed project information
- `ARCHITECTURE.md` - Architecture & patterns explanation

---

**Project berhasil dibuat! 🎉 Siap untuk development. Selamat bekerja!**
