# Manajemen Dashboard README

## Project Setup

Ini adalah Manajemen Dashboard yang dibangun dengan Vue 3, TypeScript, dan Naive UI. Sistem ini mengikuti pola arsitektur yang sama dengan project HRIS yang ada.

### Fitur Utama

- **Authentication**: Login dengan username dan password yang terintegrasi dengan backend
- **Responsive Design**: UI yang responsif untuk desktop dan mobile
- **Theme Support**: Light dan dark theme
- **Modular Architecture**: Struktur folder yang terorganisir dengan baik

### Struktur Folder

```
src/
├── components/      # Vue components (Login, ProfileBar, dll)
├── constant/        # Konfigurasi dan konstanta
├── container/       # Page components (Dashboard, dll)
├── hooks/           # Custom Vue hooks
├── locales/         # Localization files
├── router/          # Vue Router configuration
├── services/        # API services dan auth service
├── assets/          # Static assets
├── App.vue          # Root component
├── App.ts           # Root component logic
└── main.ts          # Entry point
```

### Setup Awal

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Update `.env.local` dengan configuration yang sesuai**:
   ```
   VITE_APP_ID=manajemen-dashboard
   VITE_BACKEND_URL=http://localhost:3000
   VITE_TOKEN_NAME=fd_token
   VITE_SESSION_NAME=fd_session
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # atau
   pnpm install
   ```

4. **Run development server**:
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```

### Build Production

```bash
npm run build
# atau
pnpm build
```

### Features

- **Login Page**: Form login dengan validasi
- **Dashboard**: Halaman utama yang menampilkan ringkasan keuangan
- **Sidebar Navigation**: Menu navigasi dengan submenu
- **Profile Bar**: Bar untuk logout dan profil user
- **Theme Switcher**: Toggle antara light dan dark theme

### Authentication Flow

1. User login melalui form dengan username dan password
2. Credentials dikirim ke backend API `/api/auth/login`
3. Backend merespons dengan token dan user data
4. Token disimpan di localStorage
5. App state berubah ke authenticated
6. User dapat mengakses dashboard

### Logout

User dapat logout melalui ProfileBar di header. Session akan dihapus dan user akan diarahkan kembali ke login page.

### Environment Variables

- `VITE_APP_ID`: Identifier untuk aplikasi
- `VITE_BACKEND_URL`: URL backend API
- `VITE_TOKEN_NAME`: Nama key untuk menyimpan token di localStorage
- `VITE_SESSION_NAME`: Nama key untuk menyimpan session data
