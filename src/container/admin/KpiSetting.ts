import { defineComponent, ref, computed, h } from "vue";
import { useMessage, NInputNumber, NInput, NSwitch, NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

export default defineComponent({
  setup() {
    const message = useMessage();
    const auth = getAuthData();

    // ── Tab aktif ────────────────────────────────────────────────────
    const activeTab = ref("setting");

    // ── Group options (untuk filter) ─────────────────────────────────
    const groupOptions = ref<{ label: string; value: number }[]>([]);
    const fetchGroupOptions = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/option/group_indicator`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        groupOptions.value = (result.data || result).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      } catch {
        // silent
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // TAB PENGATURAN KPI TAHUNAN
    // ══════════════════════════════════════════════════════════════════
    const currentYear = new Date().getFullYear();
    const selectedYear = ref<number>(currentYear);
    const settingLoading = ref(false);
    const saveLoading = ref(false);
    const settingItems = ref<any[]>([]);
    const filterGroupIdSetting = ref<number | null>(null);

    const yearOptions = computed(() => {
      const years = [];
      for (let y = currentYear + 3; y >= currentYear - 5; y--) {
        years.push({ label: String(y), value: y });
      }
      return years;
    });

    const filteredSettingItems = computed(() => {
      if (!filterGroupIdSetting.value) return settingItems.value;
      return settingItems.value.filter(
        (x) => x.groupId === filterGroupIdSetting.value,
      );
    });

    const settingSummary = computed(() => ({
      total: filteredSettingItems.value.length,
      selected: filteredSettingItems.value.filter((x) => x.inputIsSelected).length,
      unselected: filteredSettingItems.value.filter((x) => !x.inputIsSelected).length,
    }));

    const fetchSettingData = async () => {
      if (!selectedYear.value) return;
      settingLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/kpi-settings/year/${selectedYear.value}`,
          { method: "GET" },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal memuat data KPI");
        }

        const result = await res.json();
        settingItems.value = (result.data || []).map((item: any) => ({
          ...item,
          inputIsSelected: item.isSelected ?? false,
          inputTargetValue: item.targetValue ?? null,
          inputNote: item.note ?? "",
        }));
      } catch (err) {
        message.error((err as Error).message || "Gagal memuat data");
      } finally {
        settingLoading.value = false;
      }
    };

    const selectAll = () => {
      filteredSettingItems.value.forEach((item) => {
        item.inputIsSelected = true;
      });
    };

    const deselectAll = () => {
      filteredSettingItems.value.forEach((item) => {
        item.inputIsSelected = false;
      });
    };

    const saveBatch = async () => {
      // Kirim SEMUA item (bukan hanya yang di-filter) agar tidak kehilangan data
      const items = settingItems.value.map((x) => ({
        indicatorId: x.indicatorId,
        isSelected: x.inputIsSelected,
        targetValue:
          x.inputTargetValue !== null && x.inputTargetValue !== ""
            ? Number(x.inputTargetValue)
            : null,
        note: x.inputNote || null,
      }));

      saveLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/kpi-settings/batch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: selectedYear.value,
              items,
              updatedBy: auth?.username ?? "system",
            }),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan");
        }

        const result = await res.json();
        message.success(
          `KPI ${selectedYear.value} tersimpan — Baru: ${result.created}, Diperbarui: ${result.updated}`,
        );
        await fetchSettingData();
      } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan");
      } finally {
        saveLoading.value = false;
      }
    };

    const settingColumns = [
      {
        title: "No",
        key: "no",
        width: 48,
        render(_: any, index: number) {
          return index + 1;
        },
      },
      { title: "Grup", key: "groupName", width: 170 },
      { title: "Indikator", key: "indicatorName" },
      {
        title: "Dipilih sebagai KPI",
        key: "inputIsSelected",
        width: 160,
        render(row: any) {
          return h(NSwitch, {
            value: row.inputIsSelected,
            checkedValue: true,
            uncheckedValue: false,
            "onUpdate:value": (val: boolean) => {
              row.inputIsSelected = val;
            },
          });
        },
      },
      {
        title: "Target",
        key: "inputTargetValue",
        width: 180,
        render(row: any) {
          return h(NInputNumber, {
            value: row.inputTargetValue,
            placeholder: "Opsional",
            showButton: false,
            disabled: !row.inputIsSelected,
            style: { width: "100%" },
            "onUpdate:value": (val: number | null) => {
              row.inputTargetValue = val;
            },
          });
        },
      },
      {
        title: "Catatan",
        key: "inputNote",
        render(row: any) {
          return h(NInput, {
            value: row.inputNote,
            placeholder: "Opsional",
            disabled: !row.inputIsSelected,
            "onUpdate:value": (val: string) => {
              row.inputNote = val;
            },
          });
        },
      },
      {
        title: "Status",
        key: "settingId",
        width: 110,
        render(row: any) {
          return h(
            NTag,
            {
              type: row.settingId ? "success" : "default",
              size: "small",
            },
            { default: () => (row.settingId ? "Tersimpan" : "Baru") },
          );
        },
      },
    ];

    // ══════════════════════════════════════════════════════════════════
    // TAB RIWAYAT KPI
    // ══════════════════════════════════════════════════════════════════
    const historyData = ref([]);
    const historyLoading = ref(false);
    const historyPage = ref(1);
    const historyPageSize = ref(20);
    const historyTotal = ref(0);
    const filterHistoryYear = ref<number | null>(null);
    const filterHistoryIsSelected = ref<boolean | null>(null);
    const filterHistoryGroupId = ref<number | null>(null);

    const filteredHistoryData = computed(() => {
      if (!filterHistoryGroupId.value) return historyData.value;
      return (historyData.value as any[]).filter(
        (x: any) => x.groupId === filterHistoryGroupId.value,
      );
    });

    const isSelectedOptions = [
      { label: "Semua Status", value: null },
      { label: "✅ Terpilih", value: true },
      { label: "⬜ Tidak Dipilih", value: false },
    ];

    const fetchHistory = async (page = 1) => {
      historyLoading.value = true;
      try {
        let url = `${Config.UrlBackend}/api/fin/kpi-settings?page=${page}&pageSize=${historyPageSize.value}`;
        if (filterHistoryYear.value) url += `&year=${filterHistoryYear.value}`;
        if (filterHistoryIsSelected.value !== null)
          url += `&isSelected=${filterHistoryIsSelected.value}`;

        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat riwayat KPI");

        const result = await res.json();
        historyData.value = result.data || [];
        historyPage.value = result.page || 1;
        historyTotal.value = result.total || 0;
      } catch (err) {
        message.error((err as Error).message || "Gagal memuat riwayat");
      } finally {
        historyLoading.value = false;
      }
    };

    const handleHistoryFilter = () => {
      historyPage.value = 1;
      fetchHistory(1);
    };

    const handleHistoryPageChange = (page: number) => {
      historyPage.value = page;
      fetchHistory(page);
    };

    const historyColumns = [
      {
        title: "Tahun",
        key: "year",
        width: 80,
      },
      { title: "Grup", key: "groupName", width: 160 },
      { title: "Indikator", key: "indicatorName" },
      {
        title: "KPI",
        key: "isSelected",
        width: 100,
        render(row: any) {
          return h(
            NTag,
            { type: row.isSelected ? "success" : "default", size: "small" },
            { default: () => (row.isSelected ? "✅ Terpilih" : "⬜ Tidak") },
          );
        },
      },
      {
        title: "Target",
        key: "targetValue",
        width: 140,
        render(row: any) {
          if (row.targetValue == null) return "-";
          return Number(row.targetValue).toLocaleString("id-ID");
        },
      },
      { title: "Catatan", key: "note" },
      {
        title: "Diperbarui",
        key: "updatedAt",
        width: 155,
        render(row: any) {
          if (!row.updatedAt) return "-";
          return new Date(row.updatedAt).toLocaleString("id-ID");
        },
      },
      { title: "Oleh", key: "updatedBy", width: 100 },
    ];

    // Init
    fetchGroupOptions();
    fetchSettingData();
    fetchHistory(1);

    return {
      activeTab,
      groupOptions,
      // setting
      selectedYear,
      yearOptions,
      settingLoading,
      saveLoading,
      settingItems,
      filterGroupIdSetting,
      filteredSettingItems,
      settingSummary,
      settingColumns,
      fetchSettingData,
      saveBatch,
      selectAll,
      deselectAll,
      // history
      historyData,
      historyLoading,
      historyPage,
      historyPageSize,
      historyTotal,
      historyColumns,
      filterHistoryYear,
      filterHistoryIsSelected,
      filterHistoryGroupId,
      filteredHistoryData,
      isSelectedOptions,
      handleHistoryFilter,
      handleHistoryPageChange,
    };
  },
});
