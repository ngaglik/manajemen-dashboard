<template>
    <div>
        <h3>Bank Notulensi Rapat</h3>

        <!-- Filter & Tambah -->
        <n-space class="mb-3" align="center" wrap>
            <n-button type="primary" @click="openAddModal">
                + Tambah Notulensi
            </n-button>
            <n-input
                v-model:value="inputSearch"
                placeholder="Cari nama kegiatan"
                clearable
                style="width: 240px"
                @keyup.enter="handleInputSearch"
                @clear="handleInputSearch"
            />
            <n-button @click="handleInputSearch">Cari</n-button>
            <n-tag type="info">Total: {{ total }}</n-tag>
        </n-space>

        <!-- Tabel utama -->
        <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :max-height="460"
            :scroll-x="1100"
            size="small"
        />

        <!-- Paginasi -->
        <n-pagination
            class="mt-3"
            v-model:page="current"
            :page-count="Math.ceil(total / pageSize)"
            @update:page="handlePageChange"
        />
    </div>

    <!-- ══ Modal Form Add/Edit ═════════════════════════════════════════ -->
    <n-modal
        v-model:show="isModalOpen"
        preset="card"
        :title="isEditMode ? 'Edit Notulensi Rapat' : 'Tambah Notulensi Rapat'"
        :style="{ width: '600px' }"
    >
        <n-spin :show="formLoading" description="Memuat...">
            <n-form :model="formData" label-placement="top">
                <n-form-item label="Nama Kegiatan" path="namaKegiatan">
                    <n-input
                        v-model:value="formData.namaKegiatan"
                        placeholder="Nama kegiatan (wajib)"
                    />
                </n-form-item>

                <n-form-item label="Tanggal" path="tanggal">
                    <n-date-picker
                        v-model:value="formData.tanggal"
                        value-format="yyyy-MM-dd"
                        type="date"
                        style="width: 100%"
                        placeholder="Pilih tanggal"
                    />
                </n-form-item>

                <n-form-item label="Upload Undangan">
                    <n-upload
                        :max="1"
                        accept=".pdf,application/pdf"
                        :default-upload="false"
                        :on-change="handleFileChange('undangan')"
                    >
                        <n-button>Pilih File Undangan</n-button>
                    </n-upload>
                    <div v-if="isEditMode && !formData.undanganFile && formData.undanganFileName" class="file-info">
                        <n-text depth="3">
                            Dokumen saat ini: {{ formData.undanganFileName }} (pilih file baru untuk mengganti)
                        </n-text>
                    </div>
                    <div v-else-if="formData.undanganFile" class="file-info">
                        <n-text depth="3">File dipilih: {{ formData.undanganFile.name }}</n-text>
                    </div>
                </n-form-item>

                <n-form-item label="Upload Presensi">
                    <n-upload
                        :max="1"
                        accept=".pdf,application/pdf"
                        :default-upload="false"
                        :on-change="handleFileChange('presensi')"
                    >
                        <n-button>Pilih File Presensi</n-button>
                    </n-upload>
                    <div v-if="isEditMode && !formData.presensiFile && formData.presensiFileName" class="file-info">
                        <n-text depth="3">
                            Dokumen saat ini: {{ formData.presensiFileName }} (pilih file baru untuk mengganti)
                        </n-text>
                    </div>
                    <div v-else-if="formData.presensiFile" class="file-info">
                        <n-text depth="3">File dipilih: {{ formData.presensiFile.name }}</n-text>
                    </div>
                </n-form-item>

                <n-form-item label="Upload Notulen">
                    <n-upload
                        :max="1"
                        accept=".pdf,application/pdf"
                        :default-upload="false"
                        :on-change="handleFileChange('notulen')"
                    >
                        <n-button>Pilih File Notulen</n-button>
                    </n-upload>
                    <div v-if="isEditMode && !formData.notulenFile && formData.notulenFileName" class="file-info">
                        <n-text depth="3">
                            Dokumen saat ini: {{ formData.notulenFileName }} (pilih file baru untuk mengganti)
                        </n-text>
                    </div>
                    <div v-else-if="formData.notulenFile" class="file-info">
                        <n-text depth="3">File dipilih: {{ formData.notulenFile.name }}</n-text>
                    </div>
                </n-form-item>
            </n-form>
        </n-spin>

        <template #footer>
            <n-space justify="end">
                <n-button @click="closeModal">Batal</n-button>
                <n-button type="primary" :loading="formLoading" @click="submitForm">
                    {{ isEditMode ? "Simpan Perubahan" : "Simpan Data" }}
                </n-button>
            </n-space>
        </template>
    </n-modal>

    <!-- ══ Modal Preview PDF ═══════════════════════════════════════════ -->
    <n-modal
        v-model:show="isPreviewOpen"
        preset="card"
        :title="previewName"
        :style="{ width: '900px' }"
    >
        <div class="preview-wrapper">
            <iframe
                v-if="previewUrl"
                :src="previewUrl"
                title="Preview PDF"
            />
        </div>
        <template #footer>
            <n-space justify="end">
                <n-button @click="isPreviewOpen = false">Tutup</n-button>
            </n-space>
        </template>
    </n-modal>
</template>

<script src="./RapatNotulen.ts" />

<style scoped>
.mb-3 {
    margin-bottom: 12px;
}

.mt-3 {
    margin-top: 12px;
}

.file-info {
    margin-top: 6px;
}

.preview-wrapper {
    height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 6px;
    background: #f5f6f8;
}
</style>
