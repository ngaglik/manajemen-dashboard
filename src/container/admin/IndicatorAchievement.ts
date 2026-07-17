import { defineComponent, ref, computed, h } from "vue";
import { useMessage, useDialog, NButton, NInputNumber, NInput } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

const MONTHS = [
  { label: "Januari", value: 1 },
  { label: "Februari", value: 2 },
  { label: "Maret", value: 3 },
  { label: "April", value: 4 },
  { label: "Mei", value: 5 },
  { label: "Juni", value: 6 },
  { label: "Juli", value: 7 },
  { label: "Agustus", value: 8 },
  { label: "September", value: 9 },
  { label: "Oktober", value: 10 },
  { label: "November", value: 11 },
  { label: "Desember", value: 12 },
];

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    // ── Tab aktif ────────────────────────────────────────────────────
    const activeTab = ref("input");

    // ── Group Indicator options ──────────────────────────────────────
    const groupIndicatorOptions = ref<{ label: string; value: number }[]>([]);
    const fetchGroupIndicatorOptions = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/option/group_indicator`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        groupIndicatorOptions.value = (result.data || result).map(
          (item: any) => ({
            label: item.name,
            value: item.id,
          }),
        );
      } catch {
        // silent — pilihan tidak kritis
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // TAB INPUT PER PERIODE
    // ══════════════════════════════════════════════════════════════════
    const currentYear = new Date().getFullYear();
    const selectedYear = ref<number>(currentYear);
    const selectedMonth = ref<number>(new Date().getMonth() + 1);
    const periodLoading = ref(false);
    const saveLoading = ref(false);
    const periodItems = ref<any[]>([]);
    const savingItemId = ref<number | null>(null);
    const periodSummary = ref({ total: 0, filled: 0, empty: 0 });

    const yearOptions = computed(() => {
      const years = [];
      for (let y = currentYear + 1; y >= currentYear - 5; y--) {
        years.push({ label: String(y), value: y });
      }
      return years;
    });

    const monthOptions = MONTHS;
    const filterGroupIdInput = ref<number | null>(null);

    // Filtered view untuk tabel input (client-side)
    const filteredPeriodItems = computed(() => {
      if (!filterGroupIdInput.value) return periodItems.value;
      return periodItems.value.filter(
        (x) => x.groupId === filterGroupIdInput.value,
      );
    });

    const filteredPeriodSummary = computed(() => ({
      total: filteredPeriodItems.value.length,
      filled: filteredPeriodItems.value.filter((x) => x.achievementId).length,
      empty: filteredPeriodItems.value.filter((x) => !x.achievementId).length,
    }));

    const selectedMonthLabel = computed(
      () => MONTHS.find((m) => m.value === selectedMonth.value)?.label ?? "",
    );

    const fetchPeriodData = async () => {
      if (!selectedYear.value || !selectedMonth.value) return;
      periodLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements/period/${selectedYear.value}/${selectedMonth.value}`,
          { method: "GET" },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal memuat data periode");
        }

        const result = await res.json();
        // Buat salinan lokal untuk di-edit
        periodItems.value = (result.data || []).map((item: any) => ({
          ...item,
          inputValue: item.value ?? null,
          inputNote: item.note ?? "",
        }));
        periodSummary.value = {
          total: result.total ?? 0,
          filled: result.filled ?? 0,
          empty: result.empty ?? 0,
        };
      } catch (err) {
        message.error((err as Error).message || "Gagal memuat data");
      } finally {
        periodLoading.value = false;
      }
    };

    // ── Auto-save single item (debounced) ───────────────────────────────
    let saveTimers: Record<number, ReturnType<typeof setTimeout>> = {};

    const saveSingleItem = async (row: any) => {
      if (row.inputValue === null || row.inputValue === undefined || row.inputValue === "") {
        return;
      }

      if (saveTimers[row.indicatorId]) {
        clearTimeout(saveTimers[row.indicatorId]);
      }

      saveTimers[row.indicatorId] = setTimeout(async () => {
        savingItemId.value = row.indicatorId;
        try {
          const res = (await apiFetch(
            `${Config.UrlBackend}/api/fin/indicator-achievements/batch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                year: selectedYear.value,
                month: selectedMonth.value,
                items: [{
                  indicatorId: row.indicatorId,
                  value: Number(row.inputValue),
                  note: row.inputNote || null,
                }],
                updatedBy: auth?.username ?? "system",
              }),
            },
          )) as Response;

          if (!res || !res.ok) {
            const err = res ? await res.json() : null;
            throw new Error(err?.message || "Gagal menyimpan");
          }

          await fetchPeriodData();
        } catch (err) {
          message.error((err as Error).message || "Gagal menyimpan");
        } finally {
          savingItemId.value = null;
          delete saveTimers[row.indicatorId];
        }
      }, 600);
    };

    const saveBatch = async () => {
      const items = periodItems.value
        .filter(
          (x) =>
            x.inputValue !== null &&
            x.inputValue !== undefined &&
            x.inputValue !== "",
        )
        .map((x) => ({
          indicatorId: x.indicatorId,
          value: Number(x.inputValue),
          note: x.inputNote || null,
        }));

      if (items.length === 0) {
        message.warning("Tidak ada nilai yang diisi");
        return;
      }

      saveLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements/batch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: selectedYear.value,
              month: selectedMonth.value,
              items,
              updatedBy: auth?.username ?? "system",
            }),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        const result = await res.json();
        message.success(
          `Berhasil disimpan — Baru: ${result.created}, Diperbarui: ${result.updated}`,
        );
        await fetchPeriodData();
      } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan");
      } finally {
        saveLoading.value = false;
      }
    };

    // Kolom tabel input periode — value & note langsung auto-save
    const periodColumns = [
      {
        title: "No",
        key: "no",
        width: 50,
        render(_: any, index: number) {
          return index + 1;
        },
      },
      { title: "Grup", key: "groupName", width: 160 },
      { title: "Indikator", key: "indicatorName" },
      {
        title: "Nilai Capaian",
        key: "inputValue",
        width: 180,
        render(row: any) {
          return h(NInputNumber, {
            value: row.inputValue,
            placeholder: "0",
            showButton: false,
            style: { width: "100%" },
            disabled: savingItemId.value === row.indicatorId,
            "onUpdate:value": (val: number | null) => {
              row.inputValue = val;
              saveSingleItem(row);
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
            "onUpdate:value": (val: string) => {
              row.inputNote = val;
            },
          });
        },
      },
      {
        title: "Status",
        key: "achievementId",
        width: 110,
        render(row: any) {
          if (savingItemId.value === row.indicatorId) {
            return "⏳ Menyimpan...";
          }
          return row.achievementId ? "✅ Terisi" : "⬜ Kosong";
        },
      },
    ];

    // ══════════════════════════════════════════════════════════════════
    // TAB RIWAYAT
    // ══════════════════════════════════════════════════════════════════
    const historyData = ref([]);
    const historyLoading = ref(false);
    const historyPage = ref(1);
    const historyPageSize = ref(20);
    const historyTotal = ref(0);
    const filterYear = ref<number | null>(null);
    const filterMonth = ref<number | null>(null);
    const filterGroupIdHistory = ref<number | null>(null);

    const filteredHistoryData = computed(() => {
      if (!filterGroupIdHistory.value) return historyData.value;
      return (historyData.value as any[]).filter(
        (x: any) => x.groupId === filterGroupIdHistory.value,
      );
    });

    const fetchHistory = async (page = 1) => {
      historyLoading.value = true;
      try {
        let url = `${Config.UrlBackend}/api/fin/indicator-achievements?page=${page}&pageSize=${historyPageSize.value}`;
        if (filterYear.value) url += `&year=${filterYear.value}`;
        if (filterMonth.value) url += `&month=${filterMonth.value}`;

        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat riwayat");

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

    const handleHistoryPageChange = (page: number) => {
      historyPage.value = page;
      fetchHistory(page);
    };

    const handleHistoryFilter = () => {
      historyPage.value = 1;
      fetchHistory(1);
    };

    const deleteAchievement = (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Hapus capaian "${row.indicatorName}" periode ${row.month}/${row.year}?`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(
              `${Config.UrlBackend}/api/fin/indicator-achievements/${row.id}`,
              { method: "DELETE" },
            )) as Response;

            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal menghapus");
            }

            message.success("Data berhasil dihapus");
            await fetchHistory(historyPage.value);
          } catch (err) {
            message.error((err as Error).message || "Gagal menghapus");
          }
        },
      });
    };

    // Modal edit riwayat
    const isEditModalOpen = ref(false);
    const editForm = ref({
      id: null as number | null,
      value: null as number | null,
      note: "",
    });

    const openEditModal = (row: any) => {
      editForm.value = { id: row.id, value: row.value, note: row.note ?? "" };
      isEditModalOpen.value = true;
    };

    const submitEdit = async () => {
      if (editForm.value.value === null) {
        message.warning("Nilai capaian wajib diisi");
        return;
      }
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements/${editForm.value.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: historyData.value.find(
                (x: any) => x.id === editForm.value.id,
              )
                ? (
                    historyData.value.find(
                      (x: any) => x.id === editForm.value.id,
                    ) as any
                  ).year
                : selectedYear.value,
              month: historyData.value.find(
                (x: any) => x.id === editForm.value.id,
              )
                ? (
                    historyData.value.find(
                      (x: any) => x.id === editForm.value.id,
                    ) as any
                  ).month
                : selectedMonth.value,
              value: editForm.value.value,
              note: editForm.value.note || null,
              updatedBy: auth?.username ?? "system",
            }),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengupdate");
        }

        message.success("Data berhasil diperbarui");
        isEditModalOpen.value = false;
        await fetchHistory(historyPage.value);
      } catch (err) {
        message.error((err as Error).message || "Gagal mengupdate");
      }
    };

    const historyColumns = [
      {
        title: "Aksi",
        key: "actions",
        width: 120,
        render(row: any) {
          return h("div", { style: { display: "flex", gap: "6px" } }, [
            h(
              NButton,
              {
                size: "small",
                type: "primary",
                onClick: () => openEditModal(row),
              },
              { default: () => "Edit" },
            ),
            h(
              NButton,
              {
                size: "small",
                type: "error",
                onClick: () => deleteAchievement(row),
              },
              { default: () => "Hapus" },
            ),
          ]);
        },
      },
      {
        title: "Periode",
        key: "period",
        width: 110,
        render(row: any) {
          const m =
            MONTHS.find((x) => x.value === row.month)?.label ?? row.month;
          return `${m} ${row.year}`;
        },
      },
      { title: "Grup", key: "groupName", width: 160 },
      { title: "Indikator", key: "indicatorName" },
      {
        title: "Nilai",
        key: "value",
        width: 130,
        render(row: any) {
          return Number(row.value).toLocaleString("id-ID");
        },
      },
      { title: "Catatan", key: "note" },
      {
        title: "Diperbarui",
        key: "updatedAt",
        width: 160,
        render(row: any) {
          if (!row.updatedAt) return "-";
          return new Date(row.updatedAt).toLocaleString("id-ID");
        },
      },
    ];

    // Init
    fetchGroupIndicatorOptions();
    fetchPeriodData();
    fetchHistory(1);

    return {
      activeTab,
      // group indicator options
      groupIndicatorOptions,
      // period input
      selectedYear,
      selectedMonth,
      yearOptions,
      monthOptions,
      selectedMonthLabel,
      periodLoading,
      saveLoading,
      periodItems,
      periodSummary,
      filterGroupIdInput,
      filteredPeriodItems,
      filteredPeriodSummary,
      periodColumns,
      fetchPeriodData,
      // history
      historyData,
      historyLoading,
      historyPage,
      historyPageSize,
      historyTotal,
      historyColumns,
      filterYear,
      filterMonth,
      filterGroupIdHistory,
      filteredHistoryData,
      handleHistoryPageChange,
      handleHistoryFilter,
      // edit modal
      isEditModalOpen,
      editForm,
      submitEdit,
      MONTHS,
    };
  },
});
