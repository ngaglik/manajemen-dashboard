<template>
    <div class="db-root">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="db-header">
            <div class="db-header-left">
                <span class="db-title">Dashboard</span>
                <n-tag type="info" size="small" class="db-year-tag">
                    {{ selectedYear }}
                </n-tag>
            </div>
            <div class="db-header-right">
                <n-select
                    v-model:value="selectedYear"
                    :options="yearOptions"
                    size="small"
                    style="width: 100px"
                    @update:value="handleYearChange"
                />
                <n-select
                    v-model:value="selectedGroup"
                    :options="groupOptions"
                    size="small"
                    style="width: 160px"
                    placeholder="Semua Grup"
                    clearable
                />
                <n-button
                    size="small"
                    :loading="loading"
                    @click="handleYearChange"
                >
                    ↻ Refresh
                </n-button>
            </div>
        </div>

        <n-spin :show="loading" description="Memuat data...">
            <!-- ── Summary Cards ────────────────────────────────────── -->
            <div class="db-cards">
                <div class="db-card db-card-blue">
                    <div class="db-card-icon">🎯</div>
                    <div class="db-card-body">
                        <div class="db-card-value">{{ totalKpi }}</div>
                        <div class="db-card-label">KPI Terpilih</div>
                        <div class="db-card-sub">tahun {{ selectedYear }}</div>
                    </div>
                </div>

                <div class="db-card db-card-green">
                    <div class="db-card-icon">✅</div>
                    <div class="db-card-body">
                        <div class="db-card-value">
                            {{ kpiFilledThisMonth }}
                            <span class="db-card-denom">/ {{ totalKpi }}</span>
                        </div>
                        <div class="db-card-label">KPI Terisi</div>
                        <div class="db-card-sub">
                            {{ MONTHS_LONG[activeMonth - 1] }}
                            {{ selectedYear }}
                        </div>
                    </div>
                </div>

                <div class="db-card db-card-orange">
                    <div class="db-card-icon">📊</div>
                    <div class="db-card-body">
                        <div class="db-card-value">
                            {{ totalIndicatorsFilled }}
                        </div>
                        <div class="db-card-label">Indikator Terisi</div>
                        <div class="db-card-sub">
                            {{ totalAchievementsYear }} entri tahun ini
                        </div>
                    </div>
                </div>

                <div class="db-card db-card-purple">
                    <div class="db-card-icon">📈</div>
                    <div class="db-card-body">
                        <div class="db-card-value">
                            <template v-if="avgAchievementRate !== null">
                                {{ avgAchievementRate }}%
                            </template>
                            <template v-else>—</template>
                        </div>
                        <div class="db-card-label">Rata-rata Capaian KPI</div>
                        <div class="db-card-sub">vs target bulan ini</div>
                    </div>
                    <n-progress
                        v-if="avgAchievementRate !== null"
                        type="line"
                        :percentage="Math.min(avgAchievementRate, 100)"
                        :indicator-placement="'inside'"
                        :height="6"
                        :border-radius="3"
                        :fill-border-radius="3"
                        class="db-card-progress"
                        status="success"
                    />
                </div>
            </div>

            <!-- ── KPI Cards : satu grafik per indikator ──────────────── -->
            <div class="db-section-bare">
                <div class="db-section-header mb-2">
                    <span class="db-section-title">
                        📉 KPI Capaian Bulanan — {{ selectedYear }}
                    </span>
                    <n-tag
                        v-if="
                            filteredKpiCards.length === 0 &&
                            kpiCards.length === 0
                        "
                        type="warning"
                        size="small"
                    >
                        Belum ada KPI terpilih
                    </n-tag>
                    <n-tag
                        v-else-if="filteredKpiCards.length === 0"
                        type="default"
                        size="small"
                    >
                        Tidak ada KPI pada grup ini
                    </n-tag>
                    <n-tag v-else type="default" size="small">
                        {{ filteredKpiCards.length }} indikator KPI
                    </n-tag>
                </div>

                <n-empty
                    v-if="kpiCards.length === 0"
                    description="Belum ada KPI terpilih untuk tahun ini. Atur KPI di menu Pengaturan Finansial."
                    style="padding: 48px 0"
                />
                <n-empty
                    v-else-if="filteredKpiCards.length === 0"
                    description="Tidak ada indikator KPI pada grup yang dipilih."
                    style="padding: 48px 0"
                />

                <div v-else class="kpi-grid">
                    <div
                        v-for="card in filteredKpiCards"
                        :key="card.indicatorId"
                        class="kpi-card"
                    >
                        <!-- Card header -->
                        <div class="kpi-card-header">
                            <div
                                class="kpi-card-title"
                                :title="card.indicatorName"
                            >
                                {{ card.indicatorName }}
                            </div>
                            <n-tag
                                size="tiny"
                                type="info"
                                class="kpi-card-group"
                            >
                                {{ card.groupName || "—" }}
                            </n-tag>
                        </div>

                        <!-- Stats row -->
                        <div class="kpi-card-stats">
                            <div class="kpi-stat">
                                <span class="kpi-stat-label">Bulan ini</span>
                                <span class="kpi-stat-value">
                                    {{
                                        card.currentVal != null
                                            ? card.currentVal.toLocaleString(
                                                  "id-ID",
                                              )
                                            : "—"
                                    }}
                                </span>
                            </div>
                            <div class="kpi-stat">
                                <span class="kpi-stat-label">Target</span>
                                <span class="kpi-stat-value kpi-target">
                                    {{
                                        card.target != null
                                            ? card.target.toLocaleString(
                                                  "id-ID",
                                              )
                                            : "—"
                                    }}
                                </span>
                            </div>
                            <div class="kpi-stat">
                                <span class="kpi-stat-label">Capaian</span>
                                <span
                                    class="kpi-stat-value"
                                    :class="{
                                        'kpi-rate-good':
                                            card.achieveRate != null &&
                                            card.achieveRate >= 100,
                                        'kpi-rate-warn':
                                            card.achieveRate != null &&
                                            card.achieveRate >= 70 &&
                                            card.achieveRate < 100,
                                        'kpi-rate-bad':
                                            card.achieveRate != null &&
                                            card.achieveRate < 70,
                                    }"
                                >
                                    {{
                                        card.achieveRate != null
                                            ? card.achieveRate + "%"
                                            : "—"
                                    }}
                                </span>
                            </div>
                            <div class="kpi-stat">
                                <span class="kpi-stat-label">Terisi</span>
                                <span class="kpi-stat-value"
                                    >{{ card.filledCount }}/12</span
                                >
                            </div>
                        </div>

                        <!-- Progress bar vs target -->
                        <n-progress
                            v-if="card.achieveRate != null"
                            type="line"
                            :percentage="Math.min(card.achieveRate, 100)"
                            :height="4"
                            :border-radius="2"
                            :fill-border-radius="2"
                            :show-indicator="false"
                            :status="
                                card.achieveRate >= 100
                                    ? 'success'
                                    : card.achieveRate >= 70
                                      ? 'warning'
                                      : 'error'
                            "
                            class="kpi-card-progress"
                        />

                        <!-- Chart -->
                        <v-chart
                            class="kpi-card-chart"
                            :option="card.chartOption"
                            :autoresize="true"
                        />
                    </div>
                </div>
            </div>

            <!-- ── Pie Charts : Dashboard Proporsional ────────────────────── -->
            <div v-if="propPieCharts.length > 0" class="db-section-bare">
                <div class="db-section-header mb-2">
                    <span class="db-section-title"
                        >🥧 Dashboard Proporsional — {{ selectedYear }}</span
                    >
                    <n-tag type="default" size="small"
                        >{{ propPieCharts.length }} grafik</n-tag
                    >
                </div>

                <div class="pie-grid">
                    <n-card
                        v-for="pie in propPieCharts"
                        :key="pie.id"
                        class="pie-card"
                        :bordered="true"
                        size="small"
                    >
                        <template #header>
                            <div class="pie-card-header">
                                <span class="pie-card-title">{{
                                    pie.name
                                }}</span>
                                <n-tag
                                    v-if="pie.year"
                                    size="tiny"
                                    type="info"
                                    >{{ pie.year }}</n-tag
                                >
                            </div>
                        </template>

                        <v-chart
                            v-if="pie.hasData"
                            class="pie-chart"
                            :option="pie.chartOption"
                            :autoresize="true"
                        />
                        <n-empty
                            v-else
                            description="Belum ada data capaian"
                            style="padding: 32px 0"
                        />
                    </n-card>
                </div>
            </div>

            <!-- ── Bar Charts : Dashboard Bar ───────────────────────────────────── -->
            <div v-if="barDashboardCharts.length > 0" class="db-section-bare">
                <div class="db-section-header mb-2">
                    <span class="db-section-title"
                        >📊 Dashboard Bar — {{ selectedYear }}</span
                    >
                    <n-tag type="default" size="small"
                        >{{ barDashboardCharts.length }} diagram</n-tag
                    >
                </div>

                <div class="bar-dash-grid">
                    <n-card
                        v-for="chart in barDashboardCharts"
                        :key="chart.id"
                        class="bar-dash-card"
                        :bordered="true"
                        size="small"
                    >
                        <template #header>
                            <div class="pie-card-header">
                                <span class="pie-card-title">{{
                                    chart.name
                                }}</span>
                                <div
                                    style="
                                        display: flex;
                                        gap: 4px;
                                        align-items: center;
                                        flex-shrink: 0;
                                    "
                                >
                                    <n-tag
                                        v-if="chart.year"
                                        size="tiny"
                                        type="info"
                                        >{{ chart.year }}</n-tag
                                    >
                                    <n-tag
                                        v-if="
                                            chart.startMonth || chart.endMonth
                                        "
                                        size="tiny"
                                        type="success"
                                    >
                                        {{
                                            MONTHS_SHORT[
                                                (chart.startMonth ?? 1) - 1
                                            ]
                                        }}
                                        –
                                        {{
                                            MONTHS_SHORT[
                                                (chart.endMonth ?? 12) - 1
                                            ]
                                        }}
                                    </n-tag>
                                </div>
                            </div>
                        </template>

                        <v-chart
                            v-if="chart.hasData"
                            class="bar-dash-chart"
                            :style="{
                                height:
                                    Math.max(200, chart.dataCount * 48) + 'px',
                            }"
                            :option="chart.chartOption"
                            :autoresize="true"
                        />
                        <n-empty
                            v-else
                            description="Belum ada data capaian"
                            style="padding: 32px 0"
                        />
                    </n-card>
                </div>
            </div>

            <!-- ── Chart 2 : Capaian Tahunan per Indikator ──────────────── -->
            <n-card class="db-section" :bordered="false">
                <template #header>
                    <div class="db-section-header">
                        <span class="db-section-title">
                            📊 Total Capaian per Indikator — {{ selectedYear }}
                        </span>
                        <n-tag type="default" size="small">
                            {{ achievementMatrix.length }} indikator
                        </n-tag>
                    </div>
                </template>

                <div class="annual-chart-wrap">
                    <v-chart
                        v-if="hasAnnualData"
                        class="annual-chart"
                        :style="{
                            height:
                                Math.max(200, achievementMatrix.length * 36) +
                                'px',
                        }"
                        :option="annualBarChartOption"
                        :autoresize="true"
                    />
                    <n-empty
                        v-else
                        description="Belum ada data capaian untuk tahun ini"
                        style="padding: 48px 0"
                    />
                </div>
            </n-card>

            <!-- ── Tabel Matrix Indikator × Bulan ─────────────────────── -->
            <n-card class="db-section" :bordered="false">
                <template #header>
                    <div class="db-section-header">
                        <span class="db-section-title">
                            📋 Matriks Capaian Indikator — {{ selectedYear }}
                        </span>
                        <n-tag type="default" size="small">
                            {{ achievementMatrix.length }} indikator × 12 bulan
                        </n-tag>
                    </div>
                </template>

                <div class="matrix-scroll-wrap">
                    <n-data-table
                        v-if="achievementMatrix.length > 0"
                        :columns="matrixColumns"
                        :data="achievementMatrix"
                        size="small"
                        :scroll-x="1400"
                        :max-height="400"
                        :striped="true"
                    />
                    <n-empty
                        v-else
                        description="Belum ada data capaian untuk tahun ini"
                        style="padding: 32px 0"
                    />
                </div>
            </n-card>
        </n-spin>
    </div>
</template>

<script src="./Dashboard.ts" />

<style scoped>
/* ── Root ──────────────────────────────────────────────────── */
.db-root {
    /* parent .app-content sudah padding 16px — tidak perlu tambah lagi */
    padding: 0;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* ── Header ────────────────────────────────────────────────── */
.db-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
}

.db-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.db-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.db-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.3px;
    white-space: nowrap;
}

.db-year-tag {
    font-size: 13px;
    font-weight: 600;
}

/* ── Summary Cards ─────────────────────────────────────────── */
.db-cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
}

@media (max-width: 860px) {
    .db-cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 480px) {
    .db-cards {
        grid-template-columns: minmax(0, 1fr);
    }
}

.db-card {
    border-radius: 10px;
    padding: 14px 14px 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
    min-width: 0;
    box-sizing: border-box;
}

.db-card-blue {
    background: linear-gradient(135deg, #e8f4fd 0%, #d0eafb 100%);
    border-left: 4px solid #2080f0;
}
.db-card-green {
    background: linear-gradient(135deg, #e8f7ee 0%, #d0f0db 100%);
    border-left: 4px solid #18a058;
}
.db-card-orange {
    background: linear-gradient(135deg, #fff4e6 0%, #ffe5c0 100%);
    border-left: 4px solid #f0a020;
}
.db-card-purple {
    background: linear-gradient(135deg, #f3e8ff 0%, #e4d0ff 100%);
    border-left: 4px solid #7c3aed;
}

.db-card-icon {
    font-size: 24px;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
}

.db-card-body {
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.db-card-value {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.15;
    color: #1a1a2e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.db-card-denom {
    font-size: 14px;
    font-weight: 500;
    opacity: 0.55;
}

.db-card-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.7;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.db-card-sub {
    font-size: 10px;
    opacity: 0.5;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.db-card-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
}

/* ── Sections ──────────────────────────────────────────────── */
.db-section {
    border-radius: 10px !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07) !important;
    width: 100%;
    box-sizing: border-box;
}

.db-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
}

.db-section-title {
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── Section bare ─────────────────────────────────────────── */
.db-section-bare {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
}

.mb-2 {
    margin-bottom: 10px;
}

/* ── KPI Grid ─────────────────────────────────────────────── */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
}

@media (max-width: 1060px) {
    .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 600px) {
    .kpi-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* ── KPI Card ─────────────────────────────────────────────── */
.kpi-card {
    background: var(--n-color, #fff);
    border: 1px solid var(--n-border-color, #e8e8e8);
    border-radius: 10px;
    padding: 12px 12px 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
    transition: box-shadow 0.2s;
}

.kpi-card:hover {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.kpi-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
}

.kpi-card-title {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.kpi-card-group {
    flex-shrink: 0;
    font-size: 10px;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── Stats row ────────────────────────────────────────────── */
.kpi-card-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    background: var(--n-color-modal, #f5f5f5);
    border-radius: 6px;
    padding: 7px 4px;
}

.kpi-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
}

.kpi-stat-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--n-text-color-3, #aaa);
    white-space: nowrap;
}

.kpi-stat-value {
    font-size: 12px;
    font-weight: 700;
    color: var(--n-text-color, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.kpi-target {
    color: #b89050;
}
.kpi-rate-good {
    color: #4aa878;
}
.kpi-rate-warn {
    color: #c09040;
}
.kpi-rate-bad {
    color: #c46868;
}

.kpi-card-progress {
    margin: 0;
}

/* ── KPI chart per card ───────────────────────────────────── */
.kpi-card-chart {
    width: 100%;
    height: 160px;
}

/* ── Pie Grid ────────────────────────────────────────────── */
.pie-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
}

@media (max-width: 1060px) {
    .pie-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 600px) {
    .pie-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

.pie-card {
    min-width: 0;
    box-sizing: border-box;
    border-radius: 10px !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07) !important;
}

.pie-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
}

.pie-card-title {
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}

.pie-chart {
    width: 100%;
    height: 280px;
}

/* ── Annual chart ───────────────────────────────────────────── */
.matrix-scroll-wrap {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
}

.annual-chart-wrap {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
}

.annual-chart {
    min-width: 420px;
    width: 100%;
    min-height: 200px;
}

/* ── Bar Dashboard ────────────────────────────────────────── */
.bar-dash-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

@media (max-width: 900px) {
    .bar-dash-grid {
        grid-template-columns: 1fr;
    }
}

.bar-dash-card {
    border-radius: 10px;
}

.bar-dash-chart {
    width: 100%;
}
</style>
