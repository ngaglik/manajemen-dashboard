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
    const achievementsPrevYear = ref<any[]>([]); // N-1
    const achievementsPrevYear2 = ref<any[]>([]); // N-2
    const propDashboards = ref<any[]>([]);
    const barDashboards = ref<any[]>([]);

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

    const fetchAchievementsPrevYear = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements?year=${selectedYear.value - 1}&pageSize=1000`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) {
          achievementsPrevYear.value = [];
          return;
        }
        const result = await res.json();
        achievementsPrevYear.value = result.data || [];
      } catch {
        achievementsPrevYear.value = [];
      }
    };

    const fetchAchievementsPrevYear2 = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements?year=${selectedYear.value - 2}&pageSize=1000`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) {
          achievementsPrevYear2.value = [];
          return;
        }
        const result = await res.json();
        achievementsPrevYear2.value = result.data || [];
      } catch {
        achievementsPrevYear2.value = [];
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

    const fetchBarDashboards = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/bar-dashboards/display?year=${selectedYear.value}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        barDashboards.value = result.data || [];
      } catch {
        /* silent */
      }
    };

    const loadAll = async () => {
      loading.value = true;
      await Promise.all([
        fetchKpiSettings(),
        fetchAchievements(),
        fetchAchievementsPrevYear(),
        fetchAchievementsPrevYear2(),
        fetchPropDashboards(),
        fetchBarDashboards(),
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
    const fmtNum = (v: number) => v.toLocaleString("id-ID");

    // ── Chart 1: KPI Cards — satu grafik per indikator ────────────
    const kpiCards = computed(() =>
      kpiSelected.value.map((kpi) => {
        const prevYear = selectedYear.value - 1;
        const prevYear2 = selectedYear.value - 2;

        const monthlyValues = MONTHS_SHORT.map((_, i) => {
          const ach = achievements.value.find(
            (a) => a.indicatorId === kpi.indicatorId && a.month === i + 1,
          );
          return ach != null ? Number(ach.value) : null;
        });

        const prevYearValues = MONTHS_SHORT.map((_, i) => {
          const ach = achievementsPrevYear.value.find(
            (a) => a.indicatorId === kpi.indicatorId && a.month === i + 1,
          );
          return ach != null ? Number(ach.value) : null;
        });

        const prevYear2Values = MONTHS_SHORT.map((_, i) => {
          const ach = achievementsPrevYear2.value.find(
            (a) => a.indicatorId === kpi.indicatorId && a.month === i + 1,
          );
          return ach != null ? Number(ach.value) : null;
        });

        const hasPrev1Data = prevYearValues.some((v) => v != null);
        const hasPrev2Data = prevYear2Values.some((v) => v != null);
        const hasAnyPrev = hasPrev1Data || hasPrev2Data;

        const target = kpi.targetValue ? Number(kpi.targetValue) : null;
        const currentVal = monthlyValues[activeMonth.value - 1];
        const achieveRate =
          target && currentVal != null
            ? Math.round((currentVal / target) * 100)
            : null;

        // Warna bar tahun ini — seragam sesuai legend
        const barColor = (val: number | null) => {
          if (val == null) return "#e2e2e2";
          return "#cddc29";
                  };

        const chartOption = {
          tooltip: {
            trigger: "axis",
            formatter: (params: any[]) => {
              const idx = params[0].dataIndex;
              const month = MONTHS_LONG[idx];
              let tip = `<b>${month}</b><br/>`;
              for (const p of params) {
                if (p.value == null) continue;
                const val = Number(p.value).toLocaleString("id-ID");
                tip += `${p.marker} ${p.seriesName}: <b>${val}</b>`;
                if (
                  p.seriesName === String(selectedYear.value) &&
                  target != null
                )
                  tip += ` (${Math.round((Number(p.value) / target) * 100)}%)`;
                tip += "<br/>";
              }
              if (target != null)
                tip += `🎯 Target: <b>${target.toLocaleString("id-ID")}</b>`;
              return tip;
            },
          },
          legend: hasAnyPrev
            ? {
                data: [
                  String(selectedYear.value),
                  String(prevYear),
                  String(prevYear2),
                ],
                selected: {
                  [String(prevYear)]: false,
                  [String(prevYear2)]: false,
                },
                top: 0,
                itemWidth: 10,
                textStyle: { fontSize: 9 },
              }
            : undefined,
          grid: {
            top: hasAnyPrev ? 22 : 8,
            bottom: 28,
            left: 8,
            right: 8,
            containLabel: true,
          },
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
              name: String(selectedYear.value),
              type: "bar",
              color: "#cddc29",
              data: monthlyValues.map((v) => ({
                value: v,
                itemStyle: { color: barColor(v), borderRadius: [3, 3, 0, 0] },
              })),
              barMaxWidth: hasAnyPrev ? 8 : 20,
              markLine:
                target != null
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: {
                        type: "dashed",
                        color: "#fdd5b1",
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
                            color: "#fdd5b1",
                          },
                        },
                      ],
                    }
                  : undefined,
            },
            ...(hasPrev1Data
              ? [
                  {
                    name: String(prevYear),
                    type: "bar",
                    color: "#b0c4d8",
                    data: prevYearValues.map((v) => ({
                      value: v,
                      itemStyle: {
                        color: v != null ? "#b0c4d8" : "#e2e2e2",
                        borderRadius: [3, 3, 0, 0],
                      },
                    })),
                    barMaxWidth: 8,
                  },
                ]
              : []),
            ...(hasPrev2Data
              ? [
                  {
                    name: String(prevYear2),
                    type: "bar",
                    color: "#ccd9e4",
                    data: prevYear2Values.map((v) => ({
                      value: v,
                      itemStyle: {
                        color: v != null ? "#ccd9e4" : "#e2e2e2",
                        borderRadius: [3, 3, 0, 0],
                      },
                    })),
                    barMaxWidth: 8,
                  },
                ]
              : []),
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
        ...new Set(
          [
            ...kpiCards.value.map((c) => c.groupName),
            ...achievements.value.map((a) => a.groupName),
          ].filter(Boolean),
        ),
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

    // ── Bar Charts: Dashboard Bar ──────────────────────────────────────
    // Setiap diagram: indikator sebagai X-axis, YoY (tahun ini vs tahun lalu)
    const barDashboardCharts = computed(() => {
      const prevYear = selectedYear.value - 1;

      const groupByIndicator = new Map<number, string>();
      for (const ach of achievements.value) {
        if (ach.groupName) groupByIndicator.set(ach.indicatorId, ach.groupName);
      }

      return barDashboards.value
        .map((dashboard) => {
          const startM = (dashboard.startMonth as number | null) ?? 1;
          const endM = (dashboard.endMonth as number | null) ?? 12;
          const prevYear2 = prevYear - 1; // N-2

          // Helper: bangun map achievement per indicator untuk satu sumber data
          const buildPeriodMap = (source: any[]) => {
            const m = new Map<number, Map<number, number>>();
            for (const ach of source) {
              if (ach.month < startM || ach.month > endM) continue;
              if (!m.has(ach.indicatorId)) m.set(ach.indicatorId, new Map());
              m.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
            }
            return m;
          };

          const achieveInPeriod = buildPeriodMap(achievements.value);
          const achieveInPeriodPrev = buildPeriodMap(
            achievementsPrevYear.value,
          );
          const achieveInPeriodPrev2 = buildPeriodMap(
            achievementsPrevYear2.value,
          );

          // Filter items berdasarkan grup yang dipilih
          const items = selectedGroup.value
            ? (dashboard.items as any[]).filter(
                (item) =>
                  groupByIndicator.get(item.indicatorId) ===
                  selectedGroup.value,
              )
            : (dashboard.items as any[]);

          // Hitung nilai N, N-1, N-2 per indikator
          const barData = items
            .map((item: any) => {
              const criteria = item.criteria || "last_month";
              const get = (m: Map<number, Map<number, number>>) =>
                computeIndicatorTotal(
                  m.get(item.indicatorId) ?? new Map(),
                  criteria,
                );
              return {
                name:
                  item.label || item.indicatorName || `#${item.indicatorId}`,
                value: get(achieveInPeriod),
                prevValue: get(achieveInPeriodPrev),
                prevValue2: get(achieveInPeriodPrev2),
              };
            })
            .filter((d) => d.value > 0 || d.prevValue > 0 || d.prevValue2 > 0)
            .sort((a, b) => b.value - a.value);

          const hasData = barData.length > 0;
          const hasPrev1Data = barData.some((d) => d.prevValue > 0);
          const hasPrev2Data = barData.some((d) => d.prevValue2 > 0);
          const hasAnyPrev = hasPrev1Data || hasPrev2Data;

          const names = barData.map((d) => d.name);
          const values = barData.map((d) => d.value);
          const prevValues = barData.map((d) => d.prevValue);
          const prevValues2 = barData.map((d) => d.prevValue2);

          const prevLabelFmt = (p: any) =>
            p.value > 0 ? fmtNum(Number(p.value)) : "";

          const chartOption = hasData
            ? {
                tooltip: {
                  trigger: "axis",
                  axisPointer: { type: "shadow" as const },
                  formatter: (params: any[]) => {
                    const name = params[0].name;
                    let tip = `<b>${name}</b><br/>`;
                    for (const p of params) {
                      if (!p.value && p.value !== 0) continue;
                      tip += `${p.marker} ${p.seriesName}: <b>${fmtNum(Number(p.value))}</b><br/>`;
                    }
                    return tip;
                  },
                },
                legend: hasAnyPrev
                  ? {
                      data: [
                        String(selectedYear.value),
                        String(prevYear),
                        String(prevYear2),
                      ],
                      selected: {
                        [String(prevYear)]: false,
                        [String(prevYear2)]: false,
                      },
                      top: 0,
                      itemWidth: 10,
                      textStyle: { fontSize: 9 },
                    }
                  : undefined,
                grid: {
                  top: hasAnyPrev ? 24 : 8,
                  bottom: 8,
                  left: 8,
                  right: 8,
                  containLabel: true,
                },
                xAxis: {
                  type: "category",
                  data: names,
                  axisLabel: {
                    fontSize: 10,
                    interval: 0,
                    overflow: "truncate",
                    width: 80,
                  },
                  axisTick: { show: false },
                  axisLine: { lineStyle: { color: "#e0e0e0" } },
                },
                yAxis: {
                  type: "value",
                  axisLabel: {
                    fontSize: 9,
                    formatter: (v: number) => fmtNum(v),
                  },
                  splitLine: {
                    lineStyle: { type: "dashed", color: "#f0f0f0" },
                  },
                },
                series: [
                  {
                    name: String(selectedYear.value),
                    type: "bar",
                    data: values,
                    barMaxWidth: hasAnyPrev ? 14 : 40,
                    label: {
                      show: true,
                      position: "top",
                      fontSize: 10,
                      formatter: (p: any) => fmtNum(Number(p.value)),
                    },
                    itemStyle: { borderRadius: [4, 4, 0, 0] },
                  },
                  ...(hasPrev1Data
                    ? [
                        {
                          name: String(prevYear),
                          type: "bar",
                          data: prevValues,
                          barMaxWidth: 14,
                          label: {
                            show: true,
                            position: "top",
                            fontSize: 10,
                            formatter: prevLabelFmt,
                          },
                          itemStyle: {
                            color: "#b0c4d8",
                            borderRadius: [4, 4, 0, 0],
                          },
                        },
                      ]
                    : []),
                  ...(hasPrev2Data
                    ? [
                        {
                          name: String(prevYear2),
                          type: "bar",
                          data: prevValues2,
                          barMaxWidth: 14,
                          label: {
                            show: true,
                            position: "top",
                            fontSize: 10,
                            formatter: prevLabelFmt,
                          },
                          itemStyle: {
                            color: "#ccd9e4",
                            borderRadius: [4, 4, 0, 0],
                          },
                        },
                      ]
                    : []),
                ],
              }
            : null;

          return {
            id: dashboard.id,
            name: dashboard.name,
            year: dashboard.year,
            startMonth: dashboard.startMonth as number | null,
            endMonth: dashboard.endMonth as number | null,
            hasData,
            itemCount: items.length,
            dataCount: barData.length,
            chartOption,
          };
        })
        .filter((chart) => !selectedGroup.value || chart.itemCount > 0);
    });

    // ── Chart 2: Capaian Tahunan per Indikator (Horizontal Bar) ───
    const annualBarChartOption = computed(() => {
      const prevYear = selectedYear.value - 1;
      const prevYear2 = selectedYear.value - 2;

      // Bangun Map per tahun: indicatorId → { month → value }
      type IndicatorInfo = {
        name: string;
        group: string;
        criteria: string;
      };

      const indicatorInfo = new Map<number, IndicatorInfo>();
      const currentMap = new Map</* id */ number, Map</* month */ number, number>>();
      const prevMap = new Map</* id */ number, Map</* month */ number, number>>();
      const prev2Map = new Map</* id */ number, Map</* month */ number, number>>();

      const ensure = (
        id: number,
        name: string,
        group: string,
        criteria: string,
      ) => {
        if (!indicatorInfo.has(id))
          indicatorInfo.set(id, { name, group, criteria });
        if (!currentMap.has(id)) currentMap.set(id, new Map());
        if (!prevMap.has(id)) prevMap.set(id, new Map());
        if (!prev2Map.has(id)) prev2Map.set(id, new Map());
      };

      // Current year — hanya sampai bulan berjalan (month-to-date)
      for (const ach of achievements.value) {
        if (ach.month > currentMonth) continue;
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          ach.groupName || "",
          ach.criteria || "last_month",
        );
        currentMap.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Previous year (Y-1)
      for (const ach of achievementsPrevYear.value) {
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          ach.groupName || "",
          ach.criteria || "last_month",
        );
        prevMap.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Previous year 2 (Y-2)
      for (const ach of achievementsPrevYear2.value) {
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          ach.groupName || "",
          ach.criteria || "last_month",
        );
        prev2Map.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Terapkan filter grup
      const filteredIds = selectedGroup.value
        ? Array.from(indicatorInfo.entries())
            .filter(([, info]) => info.group === selectedGroup.value)
            .map(([id]) => id)
        : Array.from(indicatorInfo.keys());

      if (!filteredIds.length) return null;

      // Hitung total tiap indikator untuk 3 periode
      const rows = filteredIds.map((id) => {
        const info = indicatorInfo.get(id)!;
        const currentTotal = computeIndicatorTotal(
          currentMap.get(id) || new Map(),
          info.criteria,
        );
        const prevTotal = computeIndicatorTotal(
          prevMap.get(id) || new Map(),
          info.criteria,
        );
        const prev2Total = computeIndicatorTotal(
          prev2Map.get(id) || new Map(),
          info.criteria,
        );
        return { name: info.name, criteria: info.criteria, currentTotal, prevTotal, prev2Total };
      });

      // Urut berdasarkan total tahun ini menurun
      const sorted = rows.sort((a, b) => b.currentTotal - a.currentTotal);
      const names = sorted.map((r) => r.name);
      const currentValues = sorted.map((r) => r.currentTotal);
      const prevValues = sorted.map((r) => r.prevTotal);
      const prev2Values = sorted.map((r) => r.prev2Total);

      const hasPrev1 = prevValues.some((v) => v > 0);
      const hasPrev2 = prev2Values.some((v) => v > 0);
      const hasAnyPrev = hasPrev1 || hasPrev2;

      const currentLabel = String(selectedYear.value);
      const prevLabel = String(prevYear);
      const prev2Label = String(prevYear2);

      const criteriaLabels = sorted.map((r) =>
        r.criteria === "accumulation" ? "Akm" : "Bln",
      );

      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: any[]) => {
            const first = params[0];
            const idx = first.dataIndex;
            const kr =
              criteriaLabels[idx] === "Akm" ? "Akumulasi" : "Bulan Terakhir";
            let tip = `<b>${first.name}</b><br/>`;
            for (const p of params) {
              if (p.value == null || p.value === 0) continue;
              tip += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString("id-ID")}</b><br/>`;
            }
            tip += `Kriteria: ${kr}`;
            return tip;
          },
        },
        legend: hasAnyPrev
          ? {
              data: [currentLabel, prevLabel, prev2Label],
              selected: {
                [prevLabel]: false,
                [prev2Label]: false,
              },
              top: -2,
              itemWidth: 12,
              textStyle: { fontSize: 10 },
            }
          : undefined,
        grid: {
          top: hasAnyPrev ? 28 : 10,
          bottom: 60,
          left: 16,
          right: 50,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: names,
          axisLabel: {
            rotate: 45,
            fontSize: 10,
            width: 80,
            overflow: "truncate",
          },
        },
        yAxis: {
          type: "value",
          axisLabel: {
            formatter: (v: number) => v.toLocaleString("id-ID"),
            fontSize: 10,
          },
          splitLine: { lineStyle: { type: "dashed" } },
        },
        series: [
          {
            name: currentLabel,
            type: "bar",
            data: currentValues,
            barMaxWidth: hasAnyPrev ? 14 : 28,
            label: {
              show: true,
              position: "top",
              fontSize: 10,
              formatter: (p: any) =>
                Number(p.value) >= 1_000
                  ? Number(p.value).toLocaleString("id-ID")
                  : String(p.value || ""),
            },
            itemStyle: { borderRadius: [4, 4, 0, 0], color: "#cddc29" },
          },
          ...(hasPrev1
            ? [
                {
                  name: prevLabel,
                  type: "bar" as const,
                  data: prevValues,
                  barMaxWidth: 14,
                  label: {
                    show: true,
                    position: "top",
                    fontSize: 10,
                    formatter: (p: any) =>
                      Number(p.value) >= 1_000
                        ? Number(p.value).toLocaleString("id-ID")
                        : p.value > 0
                          ? String(p.value)
                          : "",
                  },
                  itemStyle: { borderRadius: [4, 4, 0, 0], color: "#91cc75" },
                },
              ]
            : []),
          ...(hasPrev2
            ? [
                {
                  name: prev2Label,
                  type: "bar" as const,
                  data: prev2Values,
                  barMaxWidth: 14,
                  label: {
                    show: true,
                    position: "top",
                    fontSize: 10,
                    formatter: (p: any) =>
                      Number(p.value) >= 1_000
                        ? Number(p.value).toLocaleString("id-ID")
                        : p.value > 0
                          ? String(p.value)
                          : "",
                  },
                  itemStyle: { borderRadius: [4, 4, 0, 0], color: "#fac858" },
                },
              ]
            : []),
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
          title: "Indikator",
          key: "name",
          fixed: "left",
          width: 120,
          ellipsis: { tooltip: true },
        },
        {
          title: "Grup",
          key: "group",
          width: 130,
          ellipsis: { tooltip: true },
        },
        {
          title: "Kriteria",
          key: "criteria",
          width: 100,
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
          return v == null ? "—" : Number(v).toLocaleString("id-ID");
        },
      }));

      const total = {
        title: "Capaian",
        key: "total",
        width: 100,
        align: "right" as const,
        render: (row: any) => {
          const v = row.total;
          const label = row.criteria === "accumulation" ? " (Akm)" : " (Σ)";
          const fmt = Number(v).toLocaleString("id-ID");
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
      // bar dashboard charts
      barDashboardCharts,
      // annual chart
      annualBarChartOption,
      hasAnnualData,
      // matrix
      achievementMatrix,
      matrixColumns,
    };
  },
});
