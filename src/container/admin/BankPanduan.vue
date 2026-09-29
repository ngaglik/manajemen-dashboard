<template>
    <div>
        <h3>Bank Panduan</h3>

        <!-- Filter & Tambah -->
        <n-space class="mb-3" align="center" wrap>
            <n-button v-if="isAdmin" type="primary" @click="openAddModal">
                + Tambah Panduan
            </n-button>
            <n-input
                v-model:value="inputSearch"
                placeholder="Cari judul"
                clearable
                style="width: 240px"
                @keyup.enter="handleInputSearch"
                @clear="handleInputSearch"
            />
            <n-button @click="handleInputSearch">Cari</n-button>
            <n-tag type="info">Total: {{ total }}</n-tag>
        </n-space>

        <!-- ══ Notifikasi usia dokumen ═══════════════════════════════ -->
        <n-alert
            v-if="docSummary.awal > 0 || docSummary.utama > 0 || docSummary.kritis > 0"
            class="mb-3"
            :type="docSummary.kritis > 0 ? 'error' : 'warning'"
            :show-icon="true"
        >
            <b>Pengingat Peninjauan Dokumen</b>
            <ul class="doc-warn-list">
                <li v-if="docSummary.awal > 0">
                    {{ docSummary.awal }} dokumen berstatus <b>Peringatan Awal</b> (usia ≥ 2,5 tahun) — segera jadwalkan peninjauan kembali.
                </li>
                <li v-if="docSummary.utama > 0">
                    {{ docSummary.utama }} dokumen <b>Perlu Ditinjau Kembali</b> (usia ≥ 3 tahun) — wajib segera ditinjau/diperbarui.
                </li>
                <li v-if="docSummary.kritis > 0">
                    {{ docSummary.kritis }} dokumen berstatus <b>Peringatan Kritis</b> (usia > 3 tahun tanpa tindakan) — berpotensi menimbulkan risiko hukum.
                </li>
            </ul>
        </n-alert>

        <!-- Tabel utama -->
        <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :max-height="460"
            :scroll-x="1050"
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
        :title="isEditMode ? 'Edit Panduan' : 'Tambah Panduan'"
        :style="{ width: '560px' }"
    >
        <n-spin :show="formLoading" description="Memuat...">
            <n-form :model="formData" label-placement="top">
                <n-form-item label="Judul" path="judul">
                    <n-input
                        v-model:value="formData.judul"
                        placeholder="Judul panduan (wajib)"
                    />
                </n-form-item>

                <n-form-item label="Tanggal Pembuatan" path="tanggalPembuatan">
                    <n-date-picker
                        v-model:value="formData.tanggalPembuatan"
                        value-format="yyyy-MM-dd"
                        type="date"
                        style="width: 100%"
                        placeholder="Pilih tanggal"
                    />
                </n-form-item>

                <n-form-item label="Dokumen PDF">
                    <n-upload
                        :max="1"
                        accept=".pdf,application/pdf"
                        :default-upload="false"
                        @change="handleFileChange"
                    >
                        <n-button>Pilih File PDF</n-button>
                    </n-upload>
                    <div v-if="isEditMode && !formData.file && formData.fileName" class="file-info">
                        <n-text depth="3">
                            Dokumen saat ini: {{ formData.fileName }} (pilih file baru untuk mengganti)
                        </n-text>
                    </div>
                    <div v-else-if="formData.file" class="file-info">
                        <n-text depth="3">File dipilih: {{ formData.file.name }}</n-text>
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

<script src="./BankPanduan.ts" />

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

.doc-warn-list {
    margin: 6px 0 0;
    padding-left: 18px;
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
