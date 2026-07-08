<template>
    <div>
        <h3>Pengaturan Dashboard Bar</h3>

        <!-- Filter & Tambah -->
        <n-space class="mb-3" align="center" wrap>
            <n-button type="primary" @click="openModal()"
                >+ Tambah Diagram</n-button
            >
            <n-select
                v-model:value="filterYear"
                :options="yearOptions"
                style="width: 140px"
                @update:value="handleFilter"
            />
        </n-space>

        <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :max-height="380"
            size="small"
        />
        <n-pagination
            class="mt-3"
            v-model:page="currentPage"
            :page-count="Math.ceil(total / pageSize)"
            @update:page="handlePageChange"
        />
    </div>

    <!-- ══ Modal Add/Edit Dashboard ══════════════════════════════════ -->
    <n-modal
        v-model:show="isModalOpen"
        :title="isEditMode ? 'Edit Diagram Bar' : 'Tambah Diagram Bar'"
        preset="dialog"
        :style="{ width: '480px' }"
    >
        <n-form :model="formData" label-width="100">
            <n-form-item label="Nama Diagram">
                <n-input
                    v-model:value="formData.name"
                    placeholder="Contoh: Keuangan Daerah"
                />
            </n-form-item>
            <n-form-item label="Tahun">
                <n-input-number
                    v-model:value="formData.year"
                    :show-button="false"
                    placeholder="Opsional"
                    style="width: 100%"
                />
            </n-form-item>
            <n-form-item label="Bulan Mulai">
                <n-select
                    v-model:value="formData.startMonth"
                    :options="monthOptions"
                    placeholder="Pilih bulan mulai"
                    clearable
                    style="width: 100%"
                />
            </n-form-item>
            <n-form-item label="Bulan Akhir">
                <n-select
                    v-model:value="formData.endMonth"
                    :options="monthOptions"
                    placeholder="Pilih bulan akhir"
                    clearable
                    style="width: 100%"
                />
            </n-form-item>
            <n-form-item label="Status">
                <n-switch v-model:value="formData.isActive" />
            </n-form-item>
        </n-form>
        <n-space justify="end">
            <n-button @click="isModalOpen = false">Batal</n-button>
            <n-button
                type="primary"
                :loading="modalLoading"
                @click="submitModal"
            >
                {{ isEditMode ? "Simpan Perubahan" : "Tambah" }}
            </n-button>
        </n-space>
    </n-modal>

    <!-- ══ Modal Kelola Indikator ════════════════════════════════════ -->
    <n-modal
        v-model:show="isItemsModalOpen"
        preset="card"
        :style="{ width: '680px' }"
        :title="`Indikator — ${activeDashboard?.name ?? ''} ${activeDashboard?.year ? '(' + activeDashboard.year + ')' : ''}`"
    >
        <n-spin :show="itemsModalLoading">
            <!-- Tambah indikator -->
            <n-card
                size="small"
                class="mb-3"
                :bordered="false"
                style="
                    background: var(--n-color-modal, #f9f9f9);
                    border-radius: 8px;
                "
            >
                <n-space align="center" wrap>
                    <n-select
                        v-model:value="selectedIndicatorId"
                        :options="indicatorOptions"
                        filterable
                        placeholder="Cari & pilih indikator..."
                        style="width: 420px"
                        clearable
                    />
                    <n-button type="primary" @click="addItemToList">
                        + Tambah
                    </n-button>
                </n-space>
            </n-card>

            <!-- Daftar item -->
            <n-empty
                v-if="editItems.length === 0 && !itemsModalLoading"
                description="Belum ada indikator. Pilih indikator di atas dan klik Tambah."
                style="padding: 24px 0"
            />

            <div v-else class="items-list">
                <div
                    v-for="(item, idx) in editItems"
                    :key="item.indicatorId"
                    class="item-row"
                >
                    <!-- Urutan & navigasi -->
                    <div class="item-order">
                        <span class="order-num">{{ idx + 1 }}</span>
                        <div class="order-btns">
                            <n-button
                                text
                                size="tiny"
                                :disabled="idx === 0"
                                @click="moveItem(idx, -1)"
                                title="Naik"
                                >▲</n-button
                            >
                            <n-button
                                text
                                size="tiny"
                                :disabled="idx === editItems.length - 1"
                                @click="moveItem(idx, 1)"
                                title="Turun"
                                >▼</n-button
                            >
                        </div>
                    </div>

                    <!-- Nama indikator -->
                    <div class="item-name">
                        {{ getIndicatorName(item.indicatorId) }}
                    </div>

                    <!-- Label kustom (opsional) -->
                    <n-input
                        v-model:value="item.label"
                        placeholder="Label (opsional)"
                        size="small"
                        class="item-label"
                    />

                    <!-- Hapus -->
                    <n-button
                        size="small"
                        type="error"
                        text
                        @click="removeItemFromList(idx)"
                        title="Hapus"
                        >✕</n-button
                    >
                </div>
            </div>
        </n-spin>

        <template #footer>
            <n-space justify="space-between" align="center">
                <n-tag type="default" size="small">
                    {{ editItems.length }} indikator
                </n-tag>
                <n-space>
                    <n-button @click="isItemsModalOpen = false">Batal</n-button>
                    <n-button
                        type="primary"
                        :loading="itemsSaveLoading"
                        @click="saveItems"
                    >
                        Simpan
                    </n-button>
                </n-space>
            </n-space>
        </template>
    </n-modal>
</template>

<script src="./BarDashboard.ts" />

<style scoped>
.mb-3 {
    margin-bottom: 12px;
}
.mt-3 {
    margin-top: 12px;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 340px;
    overflow-y: auto;
    padding-right: 4px;
}

.item-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--n-color, #fff);
    border: 1px solid var(--n-border-color, #eee);
    border-radius: 6px;
    padding: 6px 10px;
}

.item-order {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
    width: 32px;
}

.order-num {
    font-size: 12px;
    font-weight: 700;
    color: var(--n-text-color-3, #aaa);
    line-height: 1;
}

.order-btns {
    display: flex;
    flex-direction: column;
    gap: 0;
    line-height: 1;
}

.item-name {
    flex: 1;
    font-size: 12px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-label {
    width: 150px;
    flex-shrink: 0;
}
</style>
