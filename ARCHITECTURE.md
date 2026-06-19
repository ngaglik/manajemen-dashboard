# Manajemen Dashboard - Architecture Guide

## Project Overview

**Manajemen Dashboard** adalah aplikasi web untuk menampilkan informasi keuangan dengan interface yang responsif dan user-friendly. Project ini mengikuti pola arsitektur yang sama dengan project HRIS yang sudah ada.

## Teknologi Stack

- **Vue 3**: Framework frontend progressive
- **TypeScript**: Type-safe development
- **Vite**: Build tool yang cepat
- **Naive UI**: Component library untuk Vue 3
- **Vue Router**: Routing library
- **Axios**: HTTP client untuk API calls

## Struktur Direktori

```
manajemen-dashboard/
├── src/
│   ├── components/           # Reusable Vue components
│   │   ├── Login.vue        # Form login
│   │   ├── ProfileBar.vue   # User profile & logout button
│   │   └── ProfileBar.ts    # ProfileBar logic
│   │
│   ├── constant/            # Konfigurasi dan konstanta
│   │   ├── config.ts        # Environment variables & config
│   │   └── constant.ts      # Menu items dan constants
│   │
│   ├── container/           # Page/Container components
│   │   └── dashboard/
│   │       └── Dashboard.vue # Main dashboard page
│   │
│   ├── hooks/               # Custom Vue hooks
│   │   └── useConfig.ts     # Theme & language config hook
│   │
│   ├── locales/             # Lokalisasi dan i18n
│   │   └── idID.ts          # Indonesian locale
│   │
│   ├── router/              # Vue Router configuration
│   │   └── router.ts        # Route definitions
│   │
│   ├── services/            # API & business logic
│   │   └── authService.ts   # Authentication service
│   │
│   ├── assets/              # Static files
│   │   └── (images, icons, dll)
│   │
│   ├── App.vue              # Root component template
│   ├── App.ts               # Root component logic
│   ├── main.ts              # Entry point
│   ├── global.d.ts          # Global type definitions
│   └── vite-env.d.ts        # Vite environment types
│
├── public/                  # Public static assets
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── .env                     # Environment variables (development)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── README.md                # Project README
└── LICENSE                  # License file
```

## Core Concepts

### Authentication Flow

1. **Login Page** (`Login.vue`): User memasukkan username dan password
2. **Auth Service** (`authService.ts`): Menangani request ke backend
3. **Token Storage**: Token disimpan di `localStorage` dengan key dari `Config.TokenName`
4. **Auth State**: `App.ts` memeriksa token saat startup
5. **Protected Routes**: Routes hanya accessible ketika authenticated

### State Management

State aplikasi dikelola di `App.ts` menggunakan Vue 3 Composition API:

- `authState`: Auth state machine (INIT, CHECKING, AUTH, UNAUTH, ERROR)
- `layoutOptions`: Menu items yang di-render
- `collapsed`: Sidebar collapse state
- `theme`: Dark/light theme preference

### Menu Building

Menu dibangun secara dinamis di `buildMenu()` berdasarkan:
- User data dari token
- User permissions/tags
- Employee category

### Environment Variables

Semua configuration disimpan di `.env` file dan diakses melalui `Config` object:

```typescript
export const Config = {
  AppId: import.meta.env.VITE_APP_ID,
  UrlBackend: import.meta.env.VITE_BACKEND_URL,
  TokenName: import.meta.env.VITE_TOKEN_NAME,
  SessionName: import.meta.env.VITE_SESSION_NAME,
};
```

## Development Workflow

### Setup

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Update .env.local dengan configuration
# 3. Install dependencies
npm install

# 4. Run development server
npm run dev
```

### Adding New Features

1. **Membuat komponen baru**:
   ```bash
   # Buat file di components/ atau container/
   # Gunakan Vue SFC (Single File Component) format
   ```

2. **Menambah route**:
   ```typescript
   // Di src/router/router.ts
   {
     path: "/new-page",
     component: NewPage,
   }
   ```

3. **Menambah menu item**:
   ```typescript
   // Di src/constant/constant.ts
   {
     label: "New Menu",
     key: "/new-page",
   }
   ```

4. **API Integration**:
   ```typescript
   // Buat service di src/services/
   export const fetchData = async () => {
     const response = await fetch(`${Config.UrlBackend}/api/data`);
     return response.json();
   };
   ```

## Best Practices

1. **Type Safety**: Selalu gunakan TypeScript types
2. **Component Reusability**: Pisahkan logic dari template
3. **Configuration**: Gunakan environment variables
4. **Error Handling**: Handle API errors gracefully
5. **Responsive Design**: Test di berbagai ukuran layar
6. **Accessibility**: Gunakan semantic HTML dan ARIA labels

## Debugging

- **DevTools**: Gunakan Vue DevTools extension
- **Network Tab**: Monitor API requests
- **Console**: Check untuk errors dan warnings
- **Local Storage**: Verifikasi token dan data yang tersimpan

## Deployment

### Build untuk production

```bash
npm run build
```

Output akan di-generate di folder `dist/`.

### Environment Variables untuk Production

```
VITE_APP_ID=manajemen-dashboard
VITE_BACKEND_URL=https://api.production.com
VITE_TOKEN_NAME=fd_token
VITE_SESSION_NAME=fd_session
```

## Troubleshooting

### Login gagal
- Cek environment variables di `.env`
- Verifikasi backend URL dan app ID
- Check network tab untuk error response

### Menu tidak muncul
- Pastikan token tersimpan dengan baik di localStorage
- Verifikasi menu items di `constant.ts`
- Check auth state di Vue DevTools

### Styling issues
- Naive UI menggunakan CSS variables untuk theming
- Check dark/light theme preferences
- Gunakan `var()` untuk CSS custom properties

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Naive UI Components](https://www.naiveui.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Vue Router](https://router.vuejs.org/)
