import { defineComponent, ref, computed, onMounted } from "vue";
import { useMessage } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";

import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default defineComponent({
  components: { VChart },

  setup() {
    const message = useMessage();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const selectedYear = ref<number>(currentYear);
    const loading = ref(false);
    const selectedGroup = ref<string | null>(null);

    // ── Raw data from API ─────────────────────────────────────────
    const kpiSettings = ref<any[]>([]);
    const achievements = ref<any[]>([]);
    const propDashboards = ref<any[]>([]);

    const fetchKpiSettings = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/kpi-settings/year/${selectedYear.value}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        kpiSettings.value = result.data || [];
      } catch {
        /* silent */
      }
    };

    const fetchAchievements = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements?year=${selectedYear.value}&pageSize=1000`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        achievements.value = result.data || [];
      } catch {
        /* silent */
      }
    };

    const fetchPropDashboards = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/prop-dashboards/display?year=${selectedYear.value}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        propDashboards.value = result.data || [];
      } catch {
        /* silent */
      }
    };

    const loadAll = async () => {
      loading.value = true;
      await Promise.all([
        fetchKpiSettings(),
        fetchAchievements(),
        fetchPropDashboards(),
      ]);
      loading.value = false;
    };

    // ── Summary stats ─────────────────────────────────────────
    const kpiSelected = computed(() =>
      kpiSettings.value.filter((x) => x.isSelected),
    );

    const activeMonth = computed(() =>
      selectedYear.value === currentYear ? currentMonth : 12,
    );

    // Filter ringkasan berdasarkan grup yang dipilih
    const kpiSelectedFiltered = computed(() =>
      selectedGroup.value
        ? kpiSelected.value.filter((x) => x.groupName === selectedGroup.value)
        : kpiSelected.value,
    );

    const achievementsFiltered = computed(() =>
      selectedGroup.value
        ? achievements.value.filter((a) => a.groupName === selectedGroup.value)
        : achievements.value,
    );

    const totalKpi = computed(() => kpiSelectedFiltered.value.length);

    const kpiFilledThisMonth = computed(() => {
      const m = activeMonth.value;
      return kpiSelectedFiltered.value.filter((kpi) =>
        achievementsFiltered.value.some(
          (a) => a.indicatorId === kpi.indicatorId && a.month === m,
        ),
      ).length;
    });

    const totalIndicatorsFilled = computed(() => {
      const ids = new Set(achievementsFiltered.value.map((a) => a.indicatorId));
      return ids.size;
    });

    const avgAchievementRate = computed(() => {
      const m = activeMonth.value;
      const kpiWithTarget = kpiSelectedFiltered.value.filter(
        (k) => k.targetValue,
      );
      if (!kpiWithTarget.length) return null;

      let sum = 0;
      let count = 0;
      for (const kpi of kpiWithTarget) {
        const ach = achievementsFiltered.value.find(
          (a) => a.indicatorId === kpi.indicatorId && a.month === m,
        );
        if (ach) {
          sum += (Number(ach.value) / Number(kpi.targetValue)) * 100;
          count++;
        }
      }
      return count > 0 ? Math.round(sum / count) : 0;
    });

    const totalAchievementsYear = computed(
      () => achievementsFiltered.value.length,
    );

    // ── Helpers ───────────────────────────────────────────────────
    const fmtNum = (v: number) =>
      v >= 1_000_000
        ? (v / 1_000_000).toFixed(2) + "M"
        : v >= 1_000
          ? (v / 1_000).toFixed(1) + "K"
          : v.toLocaleString("id-ID");

    // ── Chart 1: KPI Cards — satu grafik per indikator ────────────
    const kpiCards = computed(() =>
      kpiSelected.value.map((kpi) => {
        const monthlyValues = MONTHS_SHORT.map((_, i) => {
          const ach = achievements.value.find(
            (a) => a.indicatorId === kpi.indicatorId && a.month === i + 1,
          );
          return ach != null ? Number(ach.value) : null;
        });

        const target = kpi.targetValue ? Number(kpi.targetValue) : null;
        const currentVal = monthlyValues[activeMonth.value - 1];
        const achieveRate =
          target && currentVal != null
            ? Math.round((currentVal / target) * 100)
            : null;

        // Warna bar: tone soft/muted
        const barColor = (val: number | null) => {
          if (val == null) return "#e2e2e2";
          if (target == null) return "#7aadd4";
          return val >= target ? "#6db992" : "#d98a8a";
        };

        const chartOption = {
          tooltip: {
            trigger: "axis",
            formatter: (params: any[]) => {
              const p = params[0];
              const month = MONTHS_LONG[p.dataIndex];
              const val =
                p.value != null ? Number(p.value).toLocaleString("id-ID") : "—";
              let tip = `<b>${month} ${selectedYear.value}</b><br/>${p.marker} Capaian: <b>${val}</b>`;
              if (target != null)
                tip += `<br/>🎯 Target: <b>${target.toLocaleString("id-ID")}</b>`;
              if (p.value != null && target != null)
                tip += `<br/>📈 ${Math.round((Number(p.value) / target) * 100)}%`;
              return tip;
            },
          },
          grid: { top: 8, bottom: 28, left: 8, right: 8, containLabel: true },
          xAxis: {
            type: "category",
            data: MONTHS_SHORT,
            axisLabel: { fontSize: 10 },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: "#e0e0e0" } },
          },
          yAxis: {
            type: "value",
            axisLabel: {
              fontSize: 9,
              formatter: (v: number) => fmtNum(v),
            },
            splitLine: { lineStyle: { type: "dashed", color: "#f0f0f0" } },
          },
          series: [
            {
              name: "Capaian",
              type: "bar",
              data: monthlyValues.map((v) => ({
                value: v,
                itemStyle: { color: barColor(v), borderRadius: [3, 3, 0, 0] },
              })),
              barMaxWidth: 20,
              markLine:
                target != null
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: {
                        type: "dashed",
                        color: "#c8a060",
                        width: 1.5,
                        opacity: 0.75,
                      },
                      data: [
                        {
                          yAxis: target,
                          label: {
                            formatter: `Target: ${fmtNum(target)}`,
                            position: "insideEndTop",
                            fontSize: 10,
                            color: "#c8a060",
                          },
                        },
                      ],
                    }
                  : undefined,
            },
          ],
        };

        return {
          indicatorId: kpi.indicatorId,
          indicatorName: kpi.indicatorName,
          groupName: kpi.groupName,
          target,
          currentVal,
          achieveRate,
          filledCount: monthlyValues.filter((v) => v != null).length,
          chartOption,
        };
      }),
    );

    // ── Group indicator filter ────────────────────────────────────
    const groupOptions = computed(() => {
      const groups = [
        ...new Set(kpiCards.value.map((c) => c.groupName).filter(Boolean)),
      ] as string[];
      return [
        { label: "Semua Grup", value: null as string | null },
        ...groups.map((g) => ({ label: g, value: g })),
      ];
    });

    const filteredKpiCards = computed(() =>
      selectedGroup.value
        ? kpiCards.value.filter((c) => c.groupName === selectedGroup.value)
        : kpiCards.value,
    );

    // ── Helpers: hitung nilai total per indikator sesuai kriteria ─
    // accumulation → ambil nilai bulan terbesar (sudah akumulatif)
    // last_month   → jumlahkan semua bulan
    const computeIndicatorTotal = (
      monthlyMap: Map<number, number>, // month (1-12) → value
      criteria: string,
    ): number => {
      if (!monthlyMap.size) return 0;
      if (criteria === "accumulation") {
        // jumlahkan semua bulan (annual total)
        let sum = 0;
        for (const v of monthlyMap.values()) sum += v;
        return sum;
      }
      // last_month: ambil nilai bulan terakhir yang ada datanya
      const lastMonth = Math.max(...monthlyMap.keys());
      return monthlyMap.get(lastMonth) ?? 0;
    };

    // ── Pie Charts: Dashboard Proporsional ───────────────────────────
    const propPieCharts = computed(() => {
      // Bangun map achievement per indicator untuk tahun ini (sekali, di luar loop)
      const achieveByIndicator = new Map<number, Map<number, number>>();
      for (const ach of achievements.value) {
        if (!achieveByIndicator.has(ach.indicatorId)) {
          achieveByIndicator.set(ach.indicatorId, new Map());
        }
        achieveByIndicator
          .get(ach.indicatorId)!
          .set(ach.month, Number(ach.value));
      }

      // Lookup indicatorId → groupName untuk filter grup
      const groupByIndicator = new Map<number, string>();
      for (const ach of achievements.value) {
        if (ach.groupName) groupByIndicator.set(ach.indicatorId, ach.groupName);
      }

      return (
        propDashboards.value
          .map((dashboard) => {
            // Filter items berdasarkan grup yang dipilih
            const items = selectedGroup.value
              ? (dashboard.items as any[]).filter(
                  (item) =>
                    groupByIndicator.get(item.indicatorId) ===
                    selectedGroup.value,
                )
              : (dashboard.items as any[]);

            // Hitung nilai tiap item sesuai kriteria
            const pieData = items
              .map((item: any) => {
                const monthMap =
                  achieveByIndicator.get(item.indicatorId) ??
                  new Map<number, number>();
                const value = computeIndicatorTotal(monthMap, item.criteria);
                return {
                  name: item.indicatorName || `#${item.indicatorId}`,
                  value,
                };
              })
              .filter((d) => d.value > 0);

            const hasData = pieData.length > 0;

            const chartOption = hasData
              ? {
                  tooltip: {
                    trigger: "item",
                    formatter: (p: any) =>
                      `${p.name}<br/>${p.marker}<b>${fmtNum(p.value)}</b> &nbsp;(${p.percent}%)`,
                  },
                  legend: {
                    type: "scroll",
                    bottom: 0,
                    itemWidth: 12,
                    textStyle: { fontSize: 10 },
                  },
                  series: [
                    {
                      type: "pie",
                      radius: ["38%", "68%"],
                      center: ["50%", "44%"],
                      data: pieData,
                      label: {
                        show: true,
                        formatter: "{b}\n{d}%",
                        fontSize: 10,
                        overflow: "truncate",
                        width: 90,
                      },
                      labelLine: { length: 8, length2: 6 },
                      emphasis: {
                        itemStyle: {
                          shadowBlur: 8,
                          shadowColor: "rgba(0,0,0,0.15)",
                        },
                      },
                    },
                  ],
                }
              : null;

            return {
              id: dashboard.id,
              name: dashboard.name,
              year: dashboard.year,
              hasData,
              pieData,
              chartOption,
            };
          })
          // Saat filter grup aktif, sembunyikan pie yang tidak punya data
          .filter((pie) => !selectedGroup.value || pie.hasData)
      );
    });

    // ── Chart 2: Capaian Tahunan per Indikator (Horizontal Bar) ───
    const annualBarChartOption = computed(() => {
      // Kumpulkan data per indikator
      const indicatorMap = new Map<
        number,
        {
          name: string;
          group: string;
          criteria: string;
          months: Map<number, number>;
        }
      >();

      for (const ach of achievements.value) {
        if (!indicatorMap.has(ach.indicatorId)) {
          indicatorMap.set(ach.indicatorId, {
            name: ach.indicatorName || `#${ach.indicatorId}`,
            group: ach.groupName || "",
            criteria: ach.criteria || "last_month",
            months: new Map(),
          });
        }
        indicatorMap
          .get(ach.indicatorId)!
          .months.set(ach.month, Number(ach.value));
      }

      // Terapkan filter grup sebelum menghitung total
      const filteredEntries = selectedGroup.value
        ? Array.from(indicatorMap.entries()).filter(
            ([, ind]) => ind.group === selectedGroup.value,
          )
        : Array.from(indicatorMap.entries());

      if (!filteredEntries.length) return null;

      // Hitung total sesuai kriteria
      const withTotal = filteredEntries.map(([, ind]) => ({
        ...ind,
        total: computeIndicatorTotal(ind.months, ind.criteria),
      }));

      const sorted = withTotal.sort((a, b) => b.total - a.total);
      const names = sorted.map((x) => x.name);
      const values = sorted.map((x) => x.total);
      const criteriaLabels = sorted.map((x) =>
        x.criteria === "accumulation" ? "Akm" : "Bln",
      );

      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: any[]) => {
            const p = params[0];
            const idx = p.dataIndex;
            const kr =
              criteriaLabels[idx] === "Akm" ? "Akumulasi" : "Bulan Terakhir";
            return `${p.name}<br/>${p.marker} Capaian: <b>${Number(p.value).toLocaleString("id-ID")}</b><br/>Kriteria: ${kr}`;
          },
        },
        grid: { top: 10, bottom: 10, left: 16, right: 60, containLabel: true },
        xAxis: {
          type: "value",
          axisLabel: {
            formatter: (v: number) =>
              v >= 1_000_000
                ? (v / 1_000_000).toFixed(1) + "M"
                : v >= 1_000
                  ? (v / 1_000).toFixed(0) + "K"
                  : String(v),
          },
          splitLine: { lineStyle: { type: "dashed" } },
        },
        yAxis: {
          type: "category",
          data: names,
          axisLabel: {
            width: 180,
            overflow: "truncate",
            fontSize: 11,
          },
        },
        series: [
          {
            name: "Total Capaian",
            type: "bar",
            data: values,
            barMaxWidth: 28,
            label: {
              show: true,
              position: "right",
              fontSize: 10,
              formatter: (p: any) =>
                Number(p.value) >= 1_000
                  ? (Number(p.value) / 1_000).toFixed(0) + "K"
                  : String(p.value),
            },
            itemStyle: { borderRadius: [0, 4, 4, 0] },
          },
        ],
      };
    });

    // ── Achievement Matrix (Tabel Indikator × Bulan) ────────────
    const achievementMatrix = computed(() => {
      const indicatorMap = new Map<
        number,
        {
          id: number;
          name: string;
          group: string;
          criteria: string;
          months: (number | null)[];
          monthMap: Map<number, number>;
          total: number;
          filledCount: number;
        }
      >();

      for (const ach of achievements.value) {
        if (!indicatorMap.has(ach.indicatorId)) {
          indicatorMap.set(ach.indicatorId, {
            id: ach.indicatorId,
            name: ach.indicatorName || `#${ach.indicatorId}`,
            group: ach.groupName || "—",
            criteria: ach.criteria || "last_month",
            months: new Array(12).fill(null),
            monthMap: new Map(),
            total: 0,
            filledCount: 0,
          });
        }
        const entry = indicatorMap.get(ach.indicatorId)!;
        const val = Number(ach.value);
        entry.months[ach.month - 1] = val;
        entry.monthMap.set(ach.month, val);
        entry.filledCount++;
      }

      // Hitung total kolom sesuai kriteria
      for (const entry of indicatorMap.values()) {
        entry.total = computeIndicatorTotal(entry.monthMap, entry.criteria);
      }

      // Terapkan filter grup
      const allEntries = Array.from(indicatorMap.values());
      const filtered = selectedGroup.value
        ? allEntries.filter((e) => e.group === selectedGroup.value)
        : allEntries;

      return filtered.sort(
        (a, b) =>
          a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
      );
    });

    const matrixColumns = computed(() => {
      const base: any[] = [
        {
          title: "Grup",
          key: "group",
          width: 130,
          fixed: "left",
          ellipsis: { tooltip: true },
        },
        {
          title: "Indikator",
          key: "name",
          width: 170,
          fixed: "left",
          ellipsis: { tooltip: true },
        },
        {
          title: "Kriteria",
          key: "criteria",
          width: 100,
          fixed: "left",
          render: (row: any) =>
            row.criteria === "accumulation" ? "📊 Akm" : "📅 Bln",
        },
      ];

      const monthCols = MONTHS_SHORT.map((m, i) => ({
        title: m,
        key: `m${i}`,
        width: 72,
        align: "right" as const,
        render: (row: any) => {
          const v = row.months[i];
          if (v == null) return "—";
          return v >= 1_000_000
            ? (v / 1_000_000).toFixed(2) + "M"
            : v >= 1_000
              ? (v / 1_000).toFixed(1) + "K"
              : v.toLocaleString("id-ID");
        },
      }));

      const total = {
        title: "Capaian",
        key: "total",
        width: 100,
        fixed: "right" as const,
        align: "right" as const,
        render: (row: any) => {
          const v = row.total;
          const label = row.criteria === "accumulation" ? " (Akm)" : " (Σ)";
          const fmt =
            v >= 1_000_000
              ? (v / 1_000_000).toFixed(2) + "M"
              : v >= 1_000
                ? (v / 1_000).toFixed(1) + "K"
                : v.toLocaleString("id-ID");
          return fmt + label;
        },
      };

      return [...base, ...monthCols, total];
    });

    // ── Year options ──────────────────────────────────────────────
    const yearOptions = computed(() => {
      const opts = [];
      for (let y = currentYear + 1; y >= currentYear - 5; y--)
        opts.push({ label: String(y), value: y });
      return opts;
    });

    const handleYearChange = () => loadAll();

    onMounted(() => loadAll());

    const hasAnnualData = computed(() => annualBarChartOption.value !== null);

    return {
      // state
      selectedYear,
      loading,
      yearOptions,
      handleYearChange,
      currentYear,
      activeMonth,
      MONTHS_SHORT,
      MONTHS_LONG,
      // summary
      totalKpi,
      kpiFilledThisMonth,
      totalIndicatorsFilled,
      totalAchievementsYear,
      avgAchievementRate,
      // kpi cards
      kpiCards,
      // group filter
      selectedGroup,
      groupOptions,
      filteredKpiCards,
      // pie charts proporsional
      propPieCharts,
      // annual chart
      annualBarChartOption,
      hasAnnualData,
      // matrix
      achievementMatrix,
      matrixColumns,
    };
  },
});
