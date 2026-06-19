<template>
    <div>
        <h3>KPI Indikator Pilihan Tahunan</h3>

        <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- ══════════════════════════════════════════════════════
                 TAB 1 : PENGATURAN KPI TAHUNAN
            ══════════════════════════════════════════════════════ -->
            <n-tab-pane name="setting" tab="Pengaturan KPI">
                <!-- Selector tahun + filter grup -->
                <n-card class="mb-3">
                    <n-space align="center" wrap>
                        <span class="label-text">Tahun</span>
                        <n-select
                            v-model:value="selectedYear"
                            :options="yearOptions"
                            style="width: 110px"
                        />

                        <span class="label-text">Filter Grup</span>
                        <n-select
                            v-model:value="filterGroupIdSetting"
                            :options="groupOptions"
                            placeholder="Semua Grup"
                            clearable
                            style="width: 210px"
                        />

                        <n-button
                            type="primary"
                            :loading="settingLoading"
                            @click="fetchSettingData"
                        >
                            Muat Data
                        </n-button>
                    </n-space>
                </n-card>

                <!-- Ringkasan + aksi pilih semua -->
                <n-space
                    v-if="settingItems.length > 0"
                    class="mb-3"
                    align="center"
                    justify="space-between"
                    :wrap="false"
                >
                    <n-space :size="10">
                        <n-tag type="default"
                            >Total: {{ settingSummary.total }}</n-tag
                        >
                        <n-tag type="success"
                            >Terpilih: {{ settingSummary.selected }}</n-tag
                        >
                        <n-tag type="warning"
                            >Tidak dipilih: {{ settingSummary.unselected }}</n-tag
                        >
                        <n-tag
                            v-if="filterGroupIdSetting"
                            type="info"
                            closable
                            @close="filterGroupIdSetting = null"
                        >
                            {{
                                groupOptions.find(
                                    (g) => g.value === filterGroupIdSetting,
                                )?.label
                            }}
                        </n-tag>
                    </n-space>

                    <n-space :size="8">
                        <n-button size="small" @click="selectAll">
                            Pilih Semua
                        </n-button>
                        <n-button size="small" @click="deselectAll">
                            Batalkan Semua
                        </n-button>
                    </n-space>
                </n-space>

                <!-- Tabel pengaturan KPI inline -->
                <n-spin :show="settingLoading">
                    <n-data-table
                        v-if="filteredSettingItems.length > 0"
                        :columns="settingColumns"
                        :data="filteredSettingItems"
                        :max-height="440"
                        size="small"
                    />
                    <n-empty
                        v-else-if="!settingLoading"
                        description="Pilih tahun dan klik Muat Data"
                    />
                </n-spin>

                <!-- Tombol simpan -->
                <n-space
                    v-if="settingItems.length > 0"
                    class="mt-3"
                    justify="end"
                >
                    <n-button
                        type="primary"
                        size="large"
                        :loading="saveLoading"
                        @click="saveBatch"
                    >
                        Simpan Pengaturan KPI {{ selectedYear }}
                    </n-button>
                </n-space>
            </n-tab-pane>

            <!-- ══════════════════════════════════════════════════════
                 TAB 2 : RIWAYAT KPI
            ══════════════════════════════════════════════════════ -->
            <n-tab-pane name="history" tab="Riwayat KPI">
                <!-- Filter -->
                <n-space class="mb-3" align="center" wrap>
                    <n-select
                        v-model:value="filterHistoryYear"
                        :options="yearOptions"
                        placeholder="Semua Tahun"
                        clearable
                        style="width: 130px"
                    />
                    <n-select
                        v-model:value="filterHistoryIsSelected"
                        :options="isSelectedOptions"
                        placeholder="Semua Status"
                        clearable
                        style="width: 160px"
                    />
                    <n-select
                        v-model:value="filterHistoryGroupId"
                        :options="groupOptions"
                        placeholder="Semua Grup"
                        clearable
                        style="width: 200px"
                    />
                    <n-button type="primary" @click="handleHistoryFilter">
                        Filter
                    </n-button>
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
</template>

<script src="./KpiSetting.ts" />

<style scoped>
.label-text {
    font-size: 14px;
    font-weight: 500;
}

.mb-3 {
    margin-bottom: 12px;
}

.mt-3 {
    margin-top: 12px;
}
</style>
