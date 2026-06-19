# 📊 CRUD Master Data - Group Indicator & Indicator

## Overview

Telah dibuat sistem CRUD lengkap untuk masterdata financial dashboard dengan dua entities utama:
1. **Group Indicator** - Pengelompokan indicator
2. **Indicator** - Detail indicator dalam group

## Database Schema

```sql
-- Group Indicator Table
CREATE TABLE "fin"."group_indicator" ( 
  "id" SERIAL,
  "name" VARCHAR(250) NULL,
  "is_active" BOOLEAN NULL DEFAULT true,
  CONSTRAINT "PK_group_indicator" PRIMARY KEY ("id")
);

-- Indicator Table
CREATE TABLE "fin"."indicator" ( 
  "id" SERIAL,
  "name" VARCHAR(250) NULL,
  "is_active" BOOLEAN NULL DEFAULT true,
  "group_id" INT,
  CONSTRAINT "PK_indicator" PRIMARY KEY ("id")
);
```

## File Structure

```
src/
├── services/
│   └── masterDataService.ts      # API services untuk CRUD
│
├── container/admin/
│   ├── GroupIndicator.vue        # CRUD Group Indicator
│   └── Indicator.vue             # CRUD Indicator
│
├── router/
│   └── router.ts                 # Routes updated
│
└── constant/
    └── constant.ts               # Menu items updated
```

## API Endpoints

### Group Indicator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fin/group-indicators` | Fetch all group indicators |
| GET | `/api/fin/group-indicators/:id` | Fetch single group indicator |
| POST | `/api/fin/group-indicators` | Create new group indicator |
| PUT | `/api/fin/group-indicators/:id` | Update group indicator |
| DELETE | `/api/fin/group-indicators/:id` | Delete group indicator |

### Indicator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fin/indicators` | Fetch all indicators |
| GET | `/api/fin/indicators/:id` | Fetch single indicator |
| POST | `/api/fin/indicators` | Create new indicator |
| PUT | `/api/fin/indicators/:id` | Update indicator |
| DELETE | `/api/fin/indicators/:id` | Delete indicator |

## Features

### 1. **Group Indicator CRUD** ✅
- ✅ List all group indicators dengan pagination
- ✅ Create new group indicator
- ✅ Edit existing group indicator
- ✅ Delete group indicator dengan confirmation
- ✅ Active/Inactive toggle

### 2. **Indicator CRUD** ✅
- ✅ List all indicators dengan pagination
- ✅ Create new indicator dengan group selection
- ✅ Edit existing indicator
- ✅ Delete indicator dengan confirmation
- ✅ Active/Inactive toggle
- ✅ Group name displayed di table

## Component Details

### GroupIndicator.vue

**Features:**
- Data table dengan 4 columns: ID, Name, Active, Actions
- Add/Edit modal dialog
- Delete confirmation dialog
- Form validation (name is required)
- Pagination support
- Success/error messages

**State Management:**
```typescript
- loading: boolean
- tableData: array
- showAddDialog: boolean
- showDeleteDialog: boolean
- editingId: number | null
- deletingId: number | null
- formData: { name, is_active }
```

**Methods:**
- `loadData()` - Fetch data dari API
- `handleEdit()` - Populate form untuk edit
- `handleDeleteClick()` - Show delete confirmation
- `handleSave()` - Create or update
- `handleDelete()` - Delete dari API
- `resetForm()` - Reset form state

### Indicator.vue

**Features:**
- Same seperti GroupIndicator tapi dengan group selection
- Group indicator dropdown di form
- Group name displayed di table
- Foreign key constraint handling

**Additional State:**
```typescript
- groupIndicators: array
- formData: { name, group_id, is_active }
```

**Additional Methods:**
- `loadGroupIndicators()` - Fetch group indicators untuk dropdown

## Service Layer

### masterDataService.ts

**Functions:**

#### Group Indicator
```typescript
fetchGroupIndicators(): Promise<any>
fetchGroupIndicatorById(id): Promise<any>
createGroupIndicator(data): Promise<any>
updateGroupIndicator(id, data): Promise<any>
deleteGroupIndicator(id): Promise<any>
```

#### Indicator
```typescript
fetchIndicators(): Promise<any>
fetchIndicatorById(id): Promise<any>
createIndicator(data): Promise<any>
updateIndicator(id, data): Promise<any>
deleteIndicator(id): Promise<any>
```

**Features:**
- Automatic token inclusion di headers
- Error handling
- JSON serialization

## Usage

### Access Routes

1. **Group Indicator Page:**
   - URL: `http://localhost:5173/group-indicator`
   - Menu: Master Data → Group Indicator

2. **Indicator Page:**
   - URL: `http://localhost:5173/indicator`
   - Menu: Master Data → Indicator

### CRUD Operations

#### Create
1. Click "Add New" button
2. Fill form (Name, Active status)
3. Click "Save"
4. Success message akan muncul
5. Table otomatis refresh

#### Read
- Data otomatis dimuat saat halaman opened
- Supports pagination dengan 10 items per page

#### Update
1. Click "Edit" button di table row
2. Form akan populated dengan data
3. Modify data sesuai kebutuhan
4. Click "Save"
5. Table otomatis refresh

#### Delete
1. Click "Delete" button di table row
2. Confirmation dialog akan muncul
3. Confirm delete
4. Data akan dihapus
5. Table otomatis refresh

## Error Handling

Setiap operasi memiliki try-catch dengan:
- Error message display di UI
- Graceful fallback
- User-friendly error messages

## Validation

### Group Indicator
- **Name**: Required, max 250 characters

### Indicator
- **Name**: Required, max 250 characters
- **Group ID**: Required

## Backend Requirements

Backend harus menyediakan endpoints dengan format response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Group Name",
      "is_active": true
    }
  ]
}
```

## Styling

- Responsive layout
- Mobile-friendly
- Uses Naive UI components
- Consistent dengan aplikasi

## Next Steps

1. **Backend Implementation:**
   - Implement REST API endpoints
   - Database migrations
   - Validation & error handling

2. **Frontend Enhancements:**
   - Search/filter functionality
   - Export to CSV/Excel
   - Bulk operations
   - Advanced filtering

3. **Testing:**
   - Unit tests
   - Integration tests
   - E2E tests

## File References

- `src/services/masterDataService.ts` - API layer (191 lines)
- `src/container/admin/GroupIndicator.vue` - CRUD UI (268 lines)
- `src/container/admin/Indicator.vue` - CRUD UI (311 lines)
- `src/router/router.ts` - Routes (28 lines)
- `src/constant/constant.ts` - Menu items (68 lines)

---

**Status: ✅ READY TO USE**

CRUD master data sudah siap digunakan. Tinggal implementasi backend endpoints.
