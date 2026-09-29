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
                    style="width: 320px"
                    placeholder="Semua Grup"
                    clearable
                />
                <n-select
                    v-model:value="selectedVerification"
                    :options="verificationOptions"
                    size="small"
                    style="width: 150px"
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
            <div class="db-section-bare db-section-bare-tosca">
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
                        @click="openZoom('kpi', card)"
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
                                :title="
                                    card.groupNames?.length
                                        ? card.groupNames.join(', ')
                                        : (card.groupName || '')
                                "
                            >
                                {{
                                    card.groupNames?.length
                                        ? card.groupNames.join(', ')
                                        : card.groupName || '—'
                                }}
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
                        <lazy-chart
                            class="kpi-card-chart"
                            :option="card.chartOption"
                        />

                        <!-- Petunjuk klik → perbesar -->
                        <span class="zoom-hint" aria-hidden="true"
                            >⤢ Perbesar</span
                        >
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
                        :class="['pie-card', { 'is-zoomable': pie.hasData }]"
                        :bordered="true"
                        size="small"
                        @click="pie.hasData && openZoom('pie', pie)"
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

                        <lazy-chart
                            v-if="pie.hasData"
                            class="pie-chart"
                            :option="pie.chartOption"
                        />
                        <n-empty
                            v-else
                            description="Belum ada data capaian"
                            style="padding: 32px 0"
                        />
                        <span
                            v-if="pie.hasData"
                            class="zoom-hint"
                            aria-hidden="true"
                            >⤢ Perbesar</span
                        >
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
                        :class="[
                            'bar-dash-card',
                            { 'is-zoomable': chart.hasData },
                        ]"
                        :bordered="true"
                        size="small"
                        @click="chart.hasData && openZoom('bar', chart)"
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

                        <lazy-chart
                            v-if="chart.hasData"
                            class="bar-dash-chart"
                            :style="{
                                height:
                                    Math.max(200, chart.dataCount * 48) + 'px',
                            }"
                            :option="chart.chartOption"
                        />
                        <n-empty
                            v-else
                            description="Belum ada data capaian"
                            style="padding: 32px 0"
                        />
                        <span
                            v-if="chart.hasData"
                            class="zoom-hint"
                            aria-hidden="true"
                            >⤢ Perbesar</span
                        >
                    </n-card>
                </div>
            </div>

            <!-- ── Chart 2 : Capaian Tahunan per Indikator ──────────────── -->
            <n-card
                :class="['db-section', { 'annual-card-zoom': hasAnnualData }]"
                :bordered="false"
                @click="hasAnnualData && openZoom('annual', null)"
            >
                <template #header>
                    <div class="db-section-header">
                        <span class="db-section-title">
                            📊 Total Capaian per Indikator
                        </span>
                        <n-tag type="default" size="small">
                            {{ selectedYear }} / {{ selectedYear - 1 }} / {{ selectedYear - 2 }}
                        </n-tag>
                    </div>
                </template>

                <div class="annual-chart-wrap">
                    <lazy-chart
                        v-if="hasAnnualData"
                        class="annual-chart"
                        style="height: 340px"
                        :option="annualBarChartOption"
                    />
                    <n-empty
                        v-else
                        description="Belum ada data capaian untuk tahun ini"
                        style="padding: 48px 0"
                    />
                </div>
                <span
                    v-if="hasAnnualData"
                    class="zoom-hint"
                    aria-hidden="true"
                    >⤢ Perbesar</span
                >
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

        <!-- ── Modal : perbesar kartu grafik ─────────────────────────── -->
        <n-modal
            v-model:show="zoomVisible"
            preset="card"
            :title="zoomTitle"
            :style="{ width: 'min(1080px, 96vw)' }"
        >
            <div v-if="zoomItem" class="zoom-body">
                <!-- Info tambahan (tahun / periode / grup) -->
                <div
                    v-if="zoomItem.kind !== 'annual'"
                    class="zoom-meta"
                >
                    <n-tag
                        v-if="zoomItem.year"
                        type="info"
                        size="small"
                        >Tahun {{ zoomItem.year }}</n-tag
                    >
                    <n-tag
                        v-if="
                            zoomItem.kind === 'bar' &&
                            (zoomItem.startMonth || zoomItem.endMonth)
                        "
                        type="success"
                        size="small"
                    >
                        {{
                            MONTHS_SHORT[(zoomItem.startMonth ?? 1) - 1]
                        }}
                        –
                        {{
                            MONTHS_SHORT[(zoomItem.endMonth ?? 12) - 1]
                        }}
                    </n-tag>
                    <n-tag
                        v-if="
                            zoomItem.kind === 'kpi' &&
                            zoomItem.groupNames &&
                            zoomItem.groupNames.length
                        "
                        type="info"
                        size="small"
                    >
                        {{ zoomItem.groupNames.join(', ') }}
                    </n-tag>
                    <n-tag
                        v-for="(pic, i) in zoomPicNames"
                        :key="`pic-${i}`"
                        type="warning"
                        size="small"
                    >
                        👤 PIC: {{ pic }}
                    </n-tag>
                </div>

                <!-- Ringkasan statistik KPI -->
                <div
                    v-if="zoomItem.kind === 'kpi'"
                    class="kpi-card-stats zoom-stats"
                >
                    <div class="kpi-stat">
                        <span class="kpi-stat-label">Bulan ini</span>
                        <span class="kpi-stat-value">
                            {{
                                zoomItem.currentVal != null
                                    ? zoomItem.currentVal.toLocaleString(
                                          'id-ID',
                                      )
                                    : '—'
                            }}
                        </span>
                    </div>
                    <div class="kpi-stat">
                        <span class="kpi-stat-label">Konjungsi</span>
                        <span class="kpi-stat-value kpi-conjunction">
                            {{ zoomItem.conjunctionLabel }}
                        </span>
                    </div>
                    <div class="kpi-stat">
                        <span class="kpi-stat-label">Target</span>
                        <span class="kpi-stat-value kpi-target">
                            {{
                                zoomItem.target != null
                                    ? zoomItem.target.toLocaleString('id-ID')
                                    : '—'
                            }}
                        </span>
                    </div>
                    <div class="kpi-stat">
                        <span class="kpi-stat-label">Capaian</span>
                        <span
                            class="kpi-stat-value"
                            :class="{
                                'kpi-rate-good':
                                    zoomItem.achieveRate != null &&
                                    zoomItem.achieveRate >= 100,
                                'kpi-rate-warn':
                                    zoomItem.achieveRate != null &&
                                    zoomItem.achieveRate >= 70 &&
                                    zoomItem.achieveRate < 100,
                                'kpi-rate-bad':
                                    zoomItem.achieveRate != null &&
                                    zoomItem.achieveRate < 70,
                            }"
                        >
                            {{
                                zoomItem.achieveRate != null
                                    ? zoomItem.achieveRate + '%'
                                    : '—'
                            }}
                        </span>
                    </div>
                    <div class="kpi-stat">
                        <span class="kpi-stat-label">Terisi</span>
                        <span class="kpi-stat-value"
                            >{{ zoomItem.filledCount }}/12</span
                        >
                    </div>
                </div>

                <n-progress
                    v-if="
                        zoomItem.kind === 'kpi' && zoomItem.achieveRate != null
                    "
                    type="line"
                    :percentage="Math.min(zoomItem.achieveRate, 100)"
                    :height="6"
                    :border-radius="3"
                    :fill-border-radius="3"
                    :show-indicator="false"
                    :status="
                        zoomItem.achieveRate >= 100
                            ? 'success'
                            : zoomItem.achieveRate >= 70
                              ? 'warning'
                              : 'error'
                    "
                    class="zoom-progress"
                />

                <!-- Grafik ukuran besar -->
                <v-chart
                    class="zoom-chart"
                    :option="zoomItem.option"
                    :autoresize="true"
                    :style="{ height: zoomItem.height + 'px' }"
                />

                <!-- Daftar file evaluasi terkait -->
                <div class="zoom-files">
                    <div class="zoom-files-title">
                        📑 File Evaluasi
                        <span class="zoom-files-count">
                            {{ zoomEvaluationFiles.length }}
                        </span>
                    </div>
                    <div
                        v-if="zoomEvaluationFiles.length > 0"
                        class="zoom-files-list"
                    >
                        <div
                            v-for="f in zoomEvaluationFiles"
                            :key="f.achievementId"
                            class="zoom-file-item"
                        >
                            <span class="zoom-file-period">
                                <template v-if="f.showIndicator"
                                    >{{ f.indicatorName }} ·
                                </template>
                                {{ f.monthLabel }}
                            </span>
                            <n-button
                                size="tiny"
                                type="info"
                                quaternary
                                :title="
                                    'Diunggah oleh ' +
                                    (f.uploadedBy || '-') +
                                    (f.uploadedAt
                                        ? ' · ' +
                                          new Date(
                                              f.uploadedAt,
                                          ).toLocaleString('id-ID')
                                        : '')
                                "
                                @click="downloadEvaluation(f)"
                            >
                                ⬇ {{ f.fileName }}
                            </n-button>
                        </div>
                    </div>
                    <div v-else class="zoom-files-empty">
                        Belum ada file evaluasi untuk tahun {{ selectedYear }}.
                        Unggah melalui menu <b>Capaian Indikator</b>.
                    </div>
                </div>
            </div>
        </n-modal>
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
    background: linear-gradient(135deg, #e6fffa 0%, #c7f2e8 100%);
    border-left: 4px solid #14b8a6;
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

.db-section-bare-tosca {
    border-left: 4px solid #14b8a6;
    padding-left: 14px;
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
    background: linear-gradient(135deg, #ffffff 0%, #14b8a6 100%);
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
    max-width: 140px;
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
    color: #14b8a6;
}

/* Progress bar sukses — tosca gradasi putih */
.kpi-card :deep(.n-progress--success) [class*="fill"] {
    background: linear-gradient(90deg, #ffffff 0%, #14b8a6 100%) !important;
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

/* ── Klik kartu grafik → perbesar (modal) ─────────────────── */
.kpi-card {
    position: relative;
}

.kpi-card,
.pie-card.is-zoomable,
.bar-dash-card.is-zoomable,
.annual-card-zoom {
    cursor: pointer;
}

.pie-card,
.bar-dash-card,
.annual-card-zoom {
    position: relative;
}

.zoom-hint {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #0f766e;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(20, 184, 166, 0.35);
    border-radius: 999px;
    padding: 2px 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    white-space: nowrap;
}

.kpi-card:hover .zoom-hint,
.pie-card.is-zoomable:hover .zoom-hint,
.bar-dash-card.is-zoomable:hover .zoom-hint,
.annual-card-zoom:hover .zoom-hint {
    opacity: 1;
}

/* ── Modal perbesar grafik ────────────────────────────────── */
.zoom-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
}

.zoom-stats {
    margin-bottom: 10px;
    /* 5 kolom: Bulan ini · Konjungsi · Target · Capaian · Terisi */
    grid-template-columns: repeat(5, minmax(0, 1fr));
}

/* Mobile: 3 kolom agar tetap rapi (Bulan ini · Konjungsi · Target,
   lalu Capaian · Terisi di baris kedua). */
@media (max-width: 560px) {
    .zoom-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

.zoom-progress {
    margin: 0 0 10px;
}

.zoom-body {
    max-height: calc(100vh - 220px);
    overflow-y: auto;
    box-sizing: border-box;
}

.zoom-chart {
    width: 100%;
}

/* ── Daftar file evaluasi pada modal zoom ─────────────────── */
.zoom-files {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--n-border-color, #eee);
}

.zoom-files-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.zoom-files-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: rgba(20, 184, 166, 0.15);
    color: #0f766e;
    font-size: 11px;
    font-weight: 700;
}

.zoom-files-empty {
    font-size: 12px;
    color: var(--n-text-color-3, #999);
}

.zoom-files-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 220px;
    overflow-y: auto;
}

.zoom-file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    min-width: 0;
}

.zoom-file-period {
    color: var(--n-text-color-3, #666);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>

<style>
/* Override Naive UI progress fill — tosca gradasi putih (non-scoped) */
.kpi-card .n-progress--success [class*="fill"] {
    background: linear-gradient(90deg, #ffffff 0%, #14b8a6 100%) !important;
}
</style>
