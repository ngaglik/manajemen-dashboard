import { defineComponent, ref, computed, onMounted } from "vue";
import { useMessage } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import LazyChart from "@/components/LazyChart.vue";

import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from "echarts/components";
import { LegacyGridContainLabel } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

use([
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  LegacyGridContainLabel,
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
  components: { VChart, LazyChart },

  setup() {
    const message = useMessage();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const selectedYear = ref<number>(currentYear);
    const loading = ref(false);
    // Filter grup indikator: single choice (null = semua grup)
    const selectedGroup = ref<string | null>(null);
    const selectedVerification = ref<"all" | "verified" | "unverified">("all");

    const verificationOptions = [
      { label: "Semua Status", value: "all" },
      { label: "✅ Verified", value: "verified" },
      { label: "⬜ Unverified", value: "unverified" },
    ];

    // ── Helper grup indikator (many-to-many: 1 indikator banyak grup) ──
    const groupsOf = (x: any): string[] => {
      if (Array.isArray(x?.groupNames) && x.groupNames.length)
        return x.groupNames;
      if (x?.groupName) return [x.groupName];
      return [];
    };

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

    // Ambil SEMUA capaian untuk satu tahun (tidak cukup satu halaman: urutan
    // API month-descending + Take(pageSize) bisa memotong bulan awal).
    // Halaman pertama dipakai untuk membaca jumlah total, sisanya diambil
    // paralel — sebelumnya tiap halaman diambil berurutan sehingga latensi
    // dashboard = jumlah halaman × RTT.
    const ACHIEVEMENT_PAGE_SIZE = 1000;
    const MAX_ACHIEVEMENT_PAGES = 50;

    // Cache per tahun (bertahan selama komponen hidup) supaya berpindah tahun
    // bolak-balik tidak mengunduh ulang tahun yang sama.
    const achievementCache = new Map<number, any[]>();

    const fetchAchievementPage = async (
      year: number,
      page: number,
    ): Promise<{ rows: any[]; total: number }> => {
      const res = (await apiFetch(
        `${Config.UrlBackend}/api/fin/indicator-achievements?year=${year}&page=${page}&pageSize=${ACHIEVEMENT_PAGE_SIZE}`,
        { method: "GET" },
      )) as Response;
      if (!res || !res.ok) return { rows: [], total: 0 };
      const result = await res.json();
      const rows = result.data || [];
      return { rows, total: result.total ?? rows.length };
    };

    const fetchAllAchievements = async (year: number): Promise<any[]> => {
      const cached = achievementCache.get(year);
      if (cached) return cached;

      const first = await fetchAchievementPage(year, 1);
      if (!first.rows.length) {
        achievementCache.set(year, []);
        return [];
      }

      const total = Math.max(first.total, first.rows.length);
      const lastPage = Math.min(
        Math.ceil(total / ACHIEVEMENT_PAGE_SIZE),
        MAX_ACHIEVEMENT_PAGES,
      );

      const all = first.rows;
      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            fetchAchievementPage(year, i + 2),
          ),
        );
        for (const page of rest) all.push(...page.rows);
      }

      achievementCache.set(year, all);
      return all;
    };

    const fetchAchievements = async () => {
      try {
        achievements.value = await fetchAllAchievements(selectedYear.value);
      } catch {
        /* silent */
      }
    };

    const fetchAchievementsPrevYear = async () => {
      try {
        achievementsPrevYear.value = await fetchAllAchievements(
          selectedYear.value - 1,
        );
      } catch {
        achievementsPrevYear.value = [];
      }
    };

    const fetchAchievementsPrevYear2 = async () => {
      try {
        achievementsPrevYear2.value = await fetchAllAchievements(
          selectedYear.value - 2,
        );
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
        ? kpiSelected.value.filter((x) =>
            groupsOf(x).includes(selectedGroup.value as string),
          )
        : kpiSelected.value,
    );

    // Filter capaian tahun berjalan berdasarkan status verifikasi
    const achievementsByVerification = computed(() => {
      if (selectedVerification.value === "all") return achievements.value;
      const wantVerified = selectedVerification.value === "verified";
      return achievements.value.filter((a) => !!a.isVerified === wantVerified);
    });

    const achievementsFiltered = computed(() => {
      let rows = achievementsByVerification.value;
      if (selectedGroup.value)
        rows = rows.filter((a) =>
          groupsOf(a).includes(selectedGroup.value as string),
        );
      return rows;
    });

    // ── Indeks data ───────────────────────────────────────────────
    // Dibangun sekali per sumber data agar pencarian tidak lagi O(n) di dalam
    // loop: sebelumnya satu kartu KPI melakukan .find() atas seluruh capaian
    // untuk 12 bulan × 3 tahun, sehingga biayanya ~K × 36 × n.
    const buildMonthIndex = (rows: any[]) => {
      const index = new Map<number, Map<number, number>>();
      for (const row of rows) {
        let months = index.get(row.indicatorId);
        if (!months) {
          months = new Map<number, number>();
          index.set(row.indicatorId, months);
        }
        months.set(row.month, Number(row.value));
      }
      return index;
    };

    const EMPTY_MONTHS: Map<number, number> = new Map();

    const monthsOf = (index: Map<number, Map<number, number>>, id: number) =>
      index.get(id) ?? EMPTY_MONTHS;

    // indicatorId → daftar nama grup (1 indikator bisa punya banyak grup)
    const buildGroupIndex = (rows: any[]) => {
      const index = new Map<number, string[]>();
      for (const row of rows) {
        const names = groupsOf(row);
        if (!names.length) continue;
        const current = index.get(row.indicatorId);
        if (!current) {
          index.set(row.indicatorId, [...names]);
          continue;
        }
        for (const name of names) {
          if (!current.includes(name)) current.push(name);
        }
      }
      return index;
    };

    // Indeks untuk grafik (hanya mengikuti filter verifikasi)
    const chartMonthIndex = computed(() =>
      buildMonthIndex(achievementsByVerification.value),
    );
    const monthIndexPrevYear = computed(() =>
      buildMonthIndex(achievementsPrevYear.value),
    );
    const monthIndexPrevYear2 = computed(() =>
      buildMonthIndex(achievementsPrevYear2.value),
    );
    const chartGroupIndex = computed(() =>
      buildGroupIndex(achievementsByVerification.value),
    );
    // Indeks untuk kartu ringkasan (ikut filter grup)
    const summaryMonthIndex = computed(() =>
      buildMonthIndex(achievementsFiltered.value),
    );

    const totalKpi = computed(() => kpiSelectedFiltered.value.length);

    const kpiFilledThisMonth = computed(() => {
      const m = activeMonth.value;
      const index = summaryMonthIndex.value;
      return kpiSelectedFiltered.value.filter((kpi) =>
        monthsOf(index, kpi.indicatorId).has(m),
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
      const index = summaryMonthIndex.value;
      for (const kpi of kpiWithTarget) {
        const value = monthsOf(index, kpi.indicatorId).get(m);
        if (value == null) continue;
        const rate = toAchievementRate(
          value,
          Number(kpi.targetValue),
          kpi.conjunction === "<=",
        );
        if (rate == null) continue;
        sum += rate;
        count++;
      }
      return count > 0 ? Math.round(sum / count) : 0;
    });

    const totalAchievementsYear = computed(
      () => achievementsFiltered.value.length,
    );

    // ── Helpers ───────────────────────────────────────────────────
    const fmtNum = (v: number) => v.toLocaleString("id-ID");

    // Rasio capaian terhadap target dengan menghormati konjungsi:
    // "<=" (semakin kecil semakin baik) → target/nilai, selain itu nilai/target.
    const toAchievementRate = (
      value: number,
      target: number,
      lowerIsBetter: boolean,
    ): number | null => {
      if (lowerIsBetter) return value > 0 ? (target / value) * 100 : null;
      return target > 0 ? (value / target) * 100 : null;
    };

    // ── Chart 1: KPI Cards — satu grafik per indikator ────────────
    const kpiCards = computed(() => {
      const prevYear = selectedYear.value - 1;
      const prevYear2 = selectedYear.value - 2;

      const currentIndex = chartMonthIndex.value;
      const prevIndex = monthIndexPrevYear.value;
      const prev2Index = monthIndexPrevYear2.value;

      return kpiSelected.value.map((kpi) => {
        const monthlyValues = MONTHS_SHORT.map(
          (_, i) => monthsOf(currentIndex, kpi.indicatorId).get(i + 1) ?? null,
        );

        const prevYearValues = MONTHS_SHORT.map(
          (_, i) => monthsOf(prevIndex, kpi.indicatorId).get(i + 1) ?? null,
        );

        const prevYear2Values = MONTHS_SHORT.map(
          (_, i) => monthsOf(prev2Index, kpi.indicatorId).get(i + 1) ?? null,
        );

        const hasPrev1Data = prevYearValues.some((v) => v != null);
        const hasPrev2Data = prevYear2Values.some((v) => v != null);
        const hasAnyPrev = hasPrev1Data || hasPrev2Data;

        const target = kpi.targetValue ? Number(kpi.targetValue) : null;
        const lowerIsBetter = kpi.conjunction === "<=";
        const currentVal = monthlyValues[activeMonth.value - 1];
        const currentRate =
          target != null && currentVal != null
            ? toAchievementRate(currentVal, target, lowerIsBetter)
            : null;
        const achieveRate = currentRate == null ? null : Math.round(currentRate);

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
                ) {
                  const rate = toAchievementRate(
                    Number(p.value),
                    target,
                    lowerIsBetter,
                  );
                  if (rate != null) tip += ` (${Math.round(rate)}%)`;
                }
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
                  ...(hasPrev1Data ? [String(prevYear)] : []),
                  ...(hasPrev2Data ? [String(prevYear2)] : []),
                ],
                selected: {
                  ...(hasPrev1Data ? { [String(prevYear)]: false } : {}),
                  ...(hasPrev2Data ? { [String(prevYear2)]: false } : {}),
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
                        width: 3,
                        opacity: 0.9,
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
          groupNames: groupsOf(kpi),
          picName: kpi.picName,
          conjunctionLabel: kpi.conjunction === "<=" ? "≤ Target" : "≥ Target",
          target,
          currentVal,
          achieveRate,
          filledCount: monthlyValues.filter((v) => v != null).length,
          chartOption,
        };
      });
    });

    // ── Group indicator filter (multi: pilih lebih dari satu grup) ──
    const groupOptions = computed(() => {
      const groups = [
        ...new Set(
          [
            ...kpiCards.value.flatMap((c) => groupsOf(c)),
            ...achievements.value.flatMap((a) => groupsOf(a)),
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
        ? kpiCards.value.filter((c) =>
            groupsOf(c).includes(selectedGroup.value as string),
          )
        : kpiCards.value,
    );

    // ── Zoom: klik kartu grafik → tampilan besar (modal) ─────────────
    const zoomItem = ref<any>(null);

    const zoomVisible = computed<boolean>({
      get: () => zoomItem.value != null,
      set: (v: boolean) => {
        if (!v) zoomItem.value = null;
      },
    });

    const zoomTitle = computed(() => {
      const z = zoomItem.value;
      if (!z) return "";
      if (z.kind === "kpi") return `📈 ${z.indicatorName ?? ""}`;
      if (z.kind === "pie") return `🥧 ${z.name ?? ""}`;
      if (z.kind === "bar") return `📊 ${z.name ?? ""}`;
      return "📊 Total Capaian per Indikator";
    });

    // Peta indikator → nama PIC (dari data pengaturan KPI tahun terpilih).
    const picByIndicator = computed(() => {
      const map = new Map<number, string>();
      for (const k of kpiSettings.value as any[]) {
        if (k?.picName) map.set(k.indicatorId, k.picName);
      }
      return map;
    });

    // Nama PIC yang relevan untuk grafik yang sedang diperbesar
    // (KPI: satu PIC; Bar/Pie: PIC indikator terkait; Tahunan: semua KPI).
    const zoomPicNames = computed<string[]>(() => {
      const z = zoomItem.value;
      if (!z) return [];
      const map = picByIndicator.value;

      if (z.kind === "kpi") {
        const name = z.picName || map.get(z.indicatorId);
        return name ? [name] : [];
      }

      const ids: number[] | null = Array.isArray(z.indicatorIds)
        ? z.indicatorIds
        : null;
      const sourceIds = ids ?? kpiSelected.value.map((k: any) => k.indicatorId);
      return [
        ...new Set(
          sourceIds
            .map((id: number) => map.get(id))
            .filter((n: any): n is string => !!n),
        ),
      ];
    });

    // Salin opsi chart untuk tampilan besar: clone utuh (fungsi
    // formatter dipertahankan) lalu perbesar ukuran teks/element kecil.
    const cloneZoomOption = (option: any): any => {
      const scaleKey = (k: string, v: any): any => {
        if (typeof v !== "number") return null;
        if (k === "fontSize") return Math.round(v * 1.5);
        if (
          k === "barMaxWidth" ||
          k === "itemWidth" ||
          k === "itemHeight" ||
          k === "length" ||
          k === "length2"
        )
          return Math.round(v * 1.6);
        if (k === "width" && v >= 60 && v <= 140) return Math.round(v * 1.5);
        if (
          (k === "top" || k === "bottom" || k === "left" || k === "right") &&
          v >= 6 &&
          v <= 90
        )
          return Math.round(v * 1.4);
        return null;
      };
      const walk = (node: any): any => {
        if (Array.isArray(node)) return node.map(walk);
        if (!node || typeof node !== "object") return node;
        const out: Record<string, any> = {};
        for (const key of Object.keys(node)) {
          const scaled = scaleKey(key, node[key]);
          out[key] = scaled != null ? scaled : walk(node[key]);
        }
        return out;
      };
      return walk(option);
    };

    // Daftar file evaluasi terkait grafik yang sedang diperbesar
    const zoomEvaluationFiles = computed(() => {
      const z = zoomItem.value;
      if (!z) return [];
      const ids: number[] | null = Array.isArray(z.indicatorIds)
        ? z.indicatorIds
        : null;
      const year = selectedYear.value;

      const rows = achievements.value.filter(
        (a: any) =>
          a.year === year &&
          !!a.evaluationFileName &&
          (ids === null || ids.includes(a.indicatorId)),
      );

      const multiIndicator = ids === null || ids.length > 1;

      return rows
        .sort((a: any, b: any) =>
          multiIndicator
            ? a.indicatorId - b.indicatorId || a.month - b.month
            : a.month - b.month,
        )
        .map((a: any) => ({
          achievementId: a.id,
          indicatorId: a.indicatorId,
          indicatorName: a.indicatorName || `#${a.indicatorId}`,
          month: a.month,
          monthLabel: MONTHS_LONG[a.month - 1] ?? String(a.month),
          fileName: a.evaluationFileName,
          uploadedAt: a.evaluationUploadedAt ?? null,
          uploadedBy: a.evaluationUploadedBy ?? null,
          showIndicator: multiIndicator,
        }));
    });

    const downloadEvaluation = async (file: any) => {
      if (!file?.achievementId) return;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements/${file.achievementId}/evaluation`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengunduh file evaluasi");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName || "evaluasi";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        message.error(
          (err as Error).message || "Gagal mengunduh file evaluasi",
        );
      }
    };

    // Buka modal perbesar untuk kartu grafik tertentu.
    const openZoom = (kind: "kpi" | "pie" | "bar" | "annual", source: any) => {
      const option =
        kind === "annual" ? annualBarChartOption.value : source?.chartOption;
      if (!option) return; // kartu tanpa data tidak bisa diperbesar

      const cats = Array.isArray(option.xAxis?.data)
        ? (option.xAxis.data as any[]).length
        : 0;

      let height = 430; // kpi
      if (kind === "pie") height = 460;
      else if (kind === "bar") height = Math.min(920, Math.max(440, cats * 56));
      else if (kind === "annual")
        height = Math.min(920, Math.max(480, cats * 34 + 120));

      zoomItem.value = {
        kind,
        ...source,
        // Indikator terkait → untuk daftar file evaluasi di bawah grafik
        indicatorIds:
          kind === "kpi"
            ? [source?.indicatorId].filter((x: any) => x != null)
            : kind === "annual"
              ? null
              : (source?.indicatorIds ?? null),
        option: cloneZoomOption(option),
        height,
      };
    };

    // ── Helpers: hitung nilai total per indikator sesuai kriteria ─
    // accumulation → jumlahkan semua bulan dalam rentang
    // average      → jumlahkan lalu bagi jumlah bulan yang ada datanya
    // last_month   → ambil nilai bulan terakhir dalam rentang yang ada datanya
    const computeIndicatorTotal = (
      monthlyMap: Map<number, number>, // month (1-12) → value
      criteria: string,
      startMonth = 1,
      endMonth = 12,
    ): number => {
      let sum = 0;
      let count = 0;
      let lastMonth = 0;
      let lastValue = 0;
      for (const [month, value] of monthlyMap) {
        if (month < startMonth || month > endMonth) continue;
        if (criteria === "accumulation") {
          sum += value;
        } else if (criteria === "average") {
          sum += value;
          count++;
        } else if (month > lastMonth) {
          lastMonth = month;
          lastValue = value;
        }
      }
      if (criteria === "accumulation") return sum;
      if (criteria === "average") return count > 0 ? sum / count : 0;
      return lastValue;
    };

    // ── Pie Charts: Dashboard Proporsional ───────────────────────────
    const propPieCharts = computed(() => {
      const achieveByIndicator = chartMonthIndex.value;
      const groupByIndicator = chartGroupIndex.value;

      return (
        propDashboards.value
          .map((dashboard) => {
            // Filter items berdasarkan grup yang dipilih (single choice)
            const items = selectedGroup.value
              ? (dashboard.items as any[]).filter((item) => {
                  const gs = groupByIndicator.get(item.indicatorId) ?? [];
                  return gs.includes(selectedGroup.value as string);
                })
              : (dashboard.items as any[]);

            // Hitung nilai tiap item sesuai kriteria
            const pieData = items
              .map((item: any) => {
                const value = computeIndicatorTotal(
                  monthsOf(achieveByIndicator, item.indicatorId),
                  item.criteria,
                );
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
              indicatorIds: items.map((i: any) => i.indicatorId),
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
      const groupByIndicator = chartGroupIndex.value;
      // Peta bulan per indikator untuk 3 periode, dibangun sekali di luar loop
      // (sebelumnya dipindai ulang untuk setiap dashboard).
      const periodSources = [
        { index: chartMonthIndex.value, key: "value" as const },
        { index: monthIndexPrevYear.value, key: "prevValue" as const },
        { index: monthIndexPrevYear2.value, key: "prevValue2" as const },
      ];

      return barDashboards.value
        .map((dashboard) => {
          const startM = (dashboard.startMonth as number | null) ?? 1;
          const endM = (dashboard.endMonth as number | null) ?? 12;
          const prevYear2 = prevYear - 1; // N-2

          // Filter items berdasarkan grup yang dipilih (single choice)
          const items = selectedGroup.value
            ? (dashboard.items as any[]).filter((item) => {
                const gs = groupByIndicator.get(item.indicatorId) ?? [];
                return gs.includes(selectedGroup.value as string);
              })
            : (dashboard.items as any[]);

          // Hitung nilai N, N-1, N-2 per indikator (hanya bulan dalam rentang)
          const barData = items
            .map((item: any) => {
              const criteria = item.criteria || "last_month";
              const entry: any = {
                name:
                  item.label || item.indicatorName || `#${item.indicatorId}`,
              };
              for (const source of periodSources) {
                entry[source.key] = computeIndicatorTotal(
                  monthsOf(source.index, item.indicatorId),
                  criteria,
                  startM,
                  endM,
                );
              }
              return entry;
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
                        ...(hasPrev1Data ? [String(prevYear)] : []),
                        ...(hasPrev2Data ? [String(prevYear2)] : []),
                      ],
                      selected: {
                        ...(hasPrev1Data ? { [String(prevYear)]: false } : {}),
                        ...(hasPrev2Data ? { [String(prevYear2)]: false } : {}),
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
            indicatorIds: items.map((i: any) => i.indicatorId),
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
        groupNames: string[];
        criteria: string;
      };

      const indicatorInfo = new Map<number, IndicatorInfo>();
      const currentMap = new Map</* id */ number, Map</* month */ number, number>>();
      const prevMap = new Map</* id */ number, Map</* month */ number, number>>();
      const prev2Map = new Map</* id */ number, Map</* month */ number, number>>();

      const ensure = (
        id: number,
        name: string,
        groupNames: string[],
        criteria: string,
      ) => {
        if (!indicatorInfo.has(id)) {
          indicatorInfo.set(id, {
            name,
            group: groupNames[0] ?? "",
            groupNames: [...groupNames],
            criteria,
          });
        } else {
          const info = indicatorInfo.get(id)!;
          for (const g of groupNames) {
            if (!info.groupNames.includes(g)) info.groupNames.push(g);
          }
          if (!info.group && info.groupNames.length) info.group = info.groupNames[0];
        }
        if (!currentMap.has(id)) currentMap.set(id, new Map());
        if (!prevMap.has(id)) prevMap.set(id, new Map());
        if (!prev2Map.has(id)) prev2Map.set(id, new Map());
      };

      // Current year — hanya sampai bulan berjalan (month-to-date)
      for (const ach of achievementsByVerification.value) {
        if (ach.month > currentMonth) continue;
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          groupsOf(ach),
          ach.criteria || "last_month",
        );
        currentMap.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Previous year (Y-1)
      for (const ach of achievementsPrevYear.value) {
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          groupsOf(ach),
          ach.criteria || "last_month",
        );
        prevMap.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Previous year 2 (Y-2)
      for (const ach of achievementsPrevYear2.value) {
        ensure(
          ach.indicatorId,
          ach.indicatorName || `#${ach.indicatorId}`,
          groupsOf(ach),
          ach.criteria || "last_month",
        );
        prev2Map.get(ach.indicatorId)!.set(ach.month, Number(ach.value));
      }

      // Terapkan filter grup (single choice)
      const filteredIds = selectedGroup.value
        ? Array.from(indicatorInfo.entries())
            .filter(([, info]) => info.groupNames.includes(selectedGroup.value as string))
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
        r.criteria === "accumulation"
          ? "Akm"
          : r.criteria === "average"
            ? "Rata"
            : "Bln",
      );

      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: any[]) => {
            const first = params[0];
            const idx = first.dataIndex;
            const kr =
              criteriaLabels[idx] === "Akm"
                ? "Akumulasi"
                : criteriaLabels[idx] === "Rata"
                  ? "Rata-rata"
                  : "Bulan Terakhir";
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
              data: [
                currentLabel,
                ...(hasPrev1 ? [prevLabel] : []),
                ...(hasPrev2 ? [prev2Label] : []),
              ],
              selected: {
                ...(hasPrev1 ? { [prevLabel]: false } : {}),
                ...(hasPrev2 ? { [prev2Label]: false } : {}),
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
          groupNames: string[];
          criteria: string;
          months: (number | null)[];
          monthMap: Map<number, number>;
          total: number;
          filledCount: number;
        }
      >();

      for (const ach of achievementsByVerification.value) {
        if (!indicatorMap.has(ach.indicatorId)) {
          indicatorMap.set(ach.indicatorId, {
            id: ach.indicatorId,
            name: ach.indicatorName || `#${ach.indicatorId}`,
            group: ach.groupName || "—",
            groupNames: [...groupsOf(ach)],
            criteria: ach.criteria || "last_month",
            months: new Array(12).fill(null),
            monthMap: new Map(),
            total: 0,
            filledCount: 0,
          });
        } else {
          const entry = indicatorMap.get(ach.indicatorId)!;
          for (const g of groupsOf(ach)) {
            if (!entry.groupNames.includes(g)) entry.groupNames.push(g);
          }
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

      // Ekspansi: satu baris per keanggotaan grup (indikator multi-grup
      // tampil di setiap grup anggotanya). Filter grup memilih anggotanya.
      const allEntries = Array.from(indicatorMap.values());
      const rows: any[] = [];
      for (const e of allEntries) {
        const memberships = e.groupNames.length
          ? e.groupNames
          : e.group !== "—"
            ? [e.group]
            : [];
        for (const g of memberships) {
          if (selectedGroup.value && g !== selectedGroup.value) continue;
          rows.push({ ...e, group: g });
        }
      }

      return rows.sort(
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
      // verification filter
      selectedVerification,
      verificationOptions,
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
      // zoom / perbesar grafik
      zoomItem,
      zoomVisible,
      zoomTitle,
      zoomPicNames,
      openZoom,
      // daftar file evaluasi pada modal zoom
      zoomEvaluationFiles,
      downloadEvaluation,
    };
  },
});
