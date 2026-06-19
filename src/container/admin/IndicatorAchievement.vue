<template>
    <div>
        <h3>Capaian Indikator</h3>

        <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- ══════════════════════════════════════════════════════
                 TAB 1 : INPUT PER PERIODE
            ══════════════════════════════════════════════════════ -->
            <n-tab-pane name="input" tab="Input per Periode">
                <!-- Selector periode -->
                <n-card class="mb-3">
                    <n-space align="center" wrap>
                        <span class="label-text">Tahun</span>
                        <n-select
                            v-model:value="selectedYear"
                            :options="yearOptions"
                            style="width: 110px"
                        />

                        <span class="label-text">Bulan</span>
                        <n-select
                            v-model:value="selectedMonth"
                            :options="monthOptions"
                            style="width: 140px"
                        />

                        <n-button
                            type="primary"
                            :loading="periodLoading"
                            @click="fetchPeriodData"
                        >
                            Muat Data
                        </n-button>
                    </n-space>
                </n-card>

                <!-- Filter grup -->
                <n-space
                    v-if="periodItems.length > 0"
                    class="mb-3"
                    align="center"
                >
                    <span class="label-text">Filter Grup:</span>
                    <n-select
                        v-model:value="filterGroupIdInput"
                        :options="groupIndicatorOptions"
                        placeholder="Semua Grup"
                        clearable
                        style="width: 220px"
                    />
                </n-space>

                <!-- Ringkasan periode -->
                <n-space v-if="periodItems.length > 0" class="mb-3" :size="12">
                    <n-tag type="default"
                        >Total: {{ filteredPeriodSummary.total }}</n-tag
                    >
                    <n-tag type="success"
                        >Terisi: {{ filteredPeriodSummary.filled }}</n-tag
                    >
                    <n-tag type="warning"
                        >Kosong: {{ filteredPeriodSummary.empty }}</n-tag
                    >
                    <span class="period-label">
                        Periode:
                        <strong
                            >{{ selectedMonthLabel }} {{ selectedYear }}</strong
                        >
                    </span>
                    <n-tag
                        v-if="filterGroupIdInput"
                        type="info"
                        closable
                        @close="filterGroupIdInput = null"
                    >
                        {{
                            groupIndicatorOptions.find(
                                (g) => g.value === filterGroupIdInput,
                            )?.label
                        }}
                    </n-tag>
                </n-space>

                <!-- Tabel input inline -->
                <n-spin :show="periodLoading">
                    <n-data-table
                        v-if="filteredPeriodItems.length > 0"
                        :columns="periodColumns"
                        :data="filteredPeriodItems"
                        :max-height="440"
                        size="small"
                    />
                    <n-empty
                        v-else-if="!periodLoading"
                        description="Pilih periode dan klik Muat Data"
                    />
                </n-spin>

                <!-- Tombol simpan -->
                <n-space
                    v-if="periodItems.length > 0"
                    class="mt-3"
                    justify="end"
                >
                    <n-button
                        type="primary"
                        size="large"
                        :loading="saveLoading"
                        @click="saveBatch"
                    >
                        Simpan Semua
                    </n-button>
                </n-space>
            </n-tab-pane>

            <!-- ══════════════════════════════════════════════════════
                 TAB 2 : RIWAYAT
            ══════════════════════════════════════════════════════ -->
            <n-tab-pane name="history" tab="Riwayat">
                <!-- Filter riwayat -->
                <n-space class="mb-3" align="center" wrap>
                    <n-select
                        v-model:value="filterYear"
                        :options="yearOptions"
                        placeholder="Semua Tahun"
                        clearable
                        style="width: 130px"
                    />
                    <n-select
                        v-model:value="filterMonth"
                        :options="monthOptions"
                        placeholder="Semua Bulan"
                        clearable
                        style="width: 150px"
                    />
                    <n-select
                        v-model:value="filterGroupIdHistory"
                        :options="groupIndicatorOptions"
                        placeholder="Semua Grup"
                        clearable
                        style="width: 200px"
                    />
                    <n-button type="primary" @click="handleHistoryFilter"
                        >Filter</n-button
                    >
                </n-space>

                <n-data-table
                    :columns="historyColumns"
                    :data="filteredHistoryData"
                    :loading="historyLoading"
                    :max-height="420"
                    size="small"
                />
                <n-pagination
                    class="mt-3"
                    v-model:page="historyPage"
                    :page-count="Math.ceil(historyTotal / historyPageSize)"
                    @update:page="handleHistoryPageChange"
                />
            </n-tab-pane>
        </n-tabs>
    </div>

    <!-- Modal edit riwayat -->
    <n-modal
        v-model:show="isEditModalOpen"
        title="Edit Nilai Capaian"
        preset="dialog"
        :style="{ width: '420px' }"
    >
        <n-form :model="editForm" label-width="120">
            <n-form-item label="Nilai Capaian">
                <n-input-number
                    v-model:value="editForm.value"
                    :show-button="false"
                    style="width: 100%"
                    placeholder="Masukkan nilai"
                />
            </n-form-item>
            <n-form-item label="Catatan">
                <n-input
                    v-model:value="editForm.note"
                    type="textarea"
                    :rows="3"
                    placeholder="Opsional"
                />
            </n-form-item>
        </n-form>
        <n-space justify="end">
            <n-button @click="isEditModalOpen = false">Batal</n-button>
            <n-button type="primary" @click="submitEdit">Simpan</n-button>
        </n-space>
    </n-modal>
</template>

<script src="./IndicatorAchievement.ts" />

<style scoped>
.label-text {
    font-size: 14px;
    font-weight: 500;
}

.period-label {
    font-size: 14px;
    color: var(--n-text-color-3, #888);
}

.mb-3 {
    margin-bottom: 12px;
}

.mt-3 {
    margin-top: 12px;
}
</style>
