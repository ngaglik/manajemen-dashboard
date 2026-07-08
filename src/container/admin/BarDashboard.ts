import { defineComponent, ref, computed, h } from "vue";
import { useMessage, useDialog, NButton, NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();

    const indicatorOptions = ref<
      { label: string; value: number; group: string }[]
    >([]);
    const fetchIndicatorOptions = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicators?pageSize=500`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        indicatorOptions.value = (result.data || []).map((x: any) => ({
          label: `${x.groupName ? "[" + x.groupName + "] " : ""}${x.name}`,
          value: x.id,
          group: x.groupName || "",
        }));
      } catch {
        /* silent */
      }
    };

    const currentYear = new Date().getFullYear();

    const monthOptions = [
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

    const yearOptions = computed(() => {
      const opts = [{ label: "Semua Tahun", value: null as number | null }];
      for (let y = currentYear + 1; y >= currentYear - 5; y--)
        opts.push({ label: String(y), value: y });
      return opts;
    });

    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const filterYear = ref<number | null>(null);

    const fetchData = async (page = 1) => {
      loading.value = true;
      try {
        let url = `${Config.UrlBackend}/api/fin/bar-dashboards?page=${page}&pageSize=${pageSize.value}`;
        if (filterYear.value) url += `&year=${filterYear.value}`;
        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat data");
        const result = await res.json();
        tableData.value = result.data || [];
        currentPage.value = result.page || 1;
        total.value = result.total || 0;
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        loading.value = false;
      }
    };

    const handlePageChange = (page: number) => {
      currentPage.value = page;
      fetchData(page);
    };
    const handleFilter = () => {
      currentPage.value = 1;
      fetchData(1);
    };

    const deleteRow = (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Hapus diagram "${row.name}"? Semua indikator di dalamnya juga akan terhapus.`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(
              `${Config.UrlBackend}/api/fin/bar-dashboards/${row.id}`,
              { method: "DELETE" },
            )) as Response;
            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal menghapus");
            }
            message.success("Berhasil dihapus");
            await fetchData(currentPage.value);
          } catch (err) {
            message.error((err as Error).message);
          }
        },
      });
    };

    const columns = [
      {
        title: "Aksi",
        key: "actions",
        width: 160,
        render(row: any) {
          return h("div", { style: { display: "flex", gap: "6px" } }, [
            h(
              NButton,
              { size: "small", type: "primary", onClick: () => openModal(row) },
              { default: () => "Edit" },
            ),
            h(
              NButton,
              {
                size: "small",
                type: "info",
                onClick: () => openItemsModal(row),
              },
              { default: () => "Indikator" },
            ),
            h(
              NButton,
              { size: "small", type: "error", onClick: () => deleteRow(row) },
              { default: () => "Hapus" },
            ),
          ]);
        },
      },
      { title: "Nama Diagram", key: "name" },
      { title: "Tahun", key: "year", width: 80 },
      {
        title: "Periode",
        key: "periode",
        width: 130,
        render: (row: any) => {
          const mn = (m: number | null) =>
            m ? monthOptions[m - 1]?.label.slice(0, 3) : null;
          const s = mn(row.startMonth);
          const e = mn(row.endMonth);
          return s || e ? `${s ?? "—"} – ${e ?? "—"}` : "Semua";
        },
      },
      {
        title: "Indikator",
        key: "itemCount",
        width: 100,
        render: (row: any) =>
          h(
            NTag,
            { type: row.itemCount > 0 ? "success" : "default", size: "small" },
            { default: () => `${row.itemCount} item` },
          ),
      },
      {
        title: "Status",
        key: "isActive",
        width: 100,
        render: (row: any) => (row.isActive ? "✅ Aktif" : "❌ Nonaktif"),
      },
    ];

    const isModalOpen = ref(false);
    const isEditMode = ref(false);
    const modalLoading = ref(false);
    const formData = ref({
      id: null as number | null,
      name: "",
      year: currentYear as number | null,
      startMonth: null as number | null,
      endMonth: null as number | null,
      isActive: true,
    });

    const openModal = (row?: any) => {
      if (row) {
        isEditMode.value = true;
        formData.value = {
          id: row.id,
          name: row.name || "",
          year: row.year ?? currentYear,
          startMonth: row.startMonth ?? null,
          endMonth: row.endMonth ?? null,
          isActive: row.isActive,
        };
      } else {
        isEditMode.value = false;
        formData.value = {
          id: null,
          name: "",
          year: currentYear,
          startMonth: null,
          endMonth: null,
          isActive: true,
        };
      }
      isModalOpen.value = true;
    };

    const submitModal = async () => {
      if (!formData.value.name.trim()) {
        message.warning("Nama diagram wajib diisi");
        return;
      }
      modalLoading.value = true;
      try {
        const body = {
          name: formData.value.name.trim(),
          year: formData.value.year,
          startMonth: formData.value.startMonth,
          endMonth: formData.value.endMonth,
          isActive: formData.value.isActive,
        };
        const url = isEditMode.value
          ? `${Config.UrlBackend}/api/fin/bar-dashboards/${formData.value.id}`
          : `${Config.UrlBackend}/api/fin/bar-dashboards`;
        const method = isEditMode.value ? "PUT" : "POST";
        const res = (await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan");
        }
        message.success(
          isEditMode.value ? "Berhasil diperbarui" : "Berhasil ditambahkan",
        );
        isModalOpen.value = false;
        await fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        modalLoading.value = false;
      }
    };

    const isItemsModalOpen = ref(false);
    const itemsModalLoading = ref(false);
    const itemsSaveLoading = ref(false);
    const activeDashboard = ref<any>(null);
    const editItems = ref<
      { indicatorId: number; label: string; sortOrder: number }[]
    >([]);
    const selectedIndicatorId = ref<number | null>(null);

    const openItemsModal = async (row: any) => {
      activeDashboard.value = row;
      editItems.value = [];
      isItemsModalOpen.value = true;
      itemsModalLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/bar-dashboards/${row.id}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat item");
        const result = await res.json();
        editItems.value = (result.data?.items || []).map((item: any) => ({
          indicatorId: item.indicatorId,
          label: item.label || "",
          sortOrder: item.sortOrder,
        }));
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        itemsModalLoading.value = false;
      }
    };

    const addItemToList = () => {
      if (!selectedIndicatorId.value) {
        message.warning("Pilih indikator terlebih dahulu");
        return;
      }
      if (
        editItems.value.some((x) => x.indicatorId === selectedIndicatorId.value)
      ) {
        message.warning("Indikator sudah ada dalam daftar");
        return;
      }
      editItems.value.push({
        indicatorId: selectedIndicatorId.value,
        label: "",
        sortOrder: editItems.value.length + 1,
      });
      selectedIndicatorId.value = null;
    };

    const removeItemFromList = (idx: number) => {
      editItems.value.splice(idx, 1);
      editItems.value.forEach((x, i) => {
        x.sortOrder = i + 1;
      });
    };
    const moveItem = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= editItems.value.length) return;
      [editItems.value[idx], editItems.value[target]] = [
        editItems.value[target],
        editItems.value[idx],
      ];
      editItems.value.forEach((x, i) => {
        x.sortOrder = i + 1;
      });
    };

    const saveItems = async () => {
      if (!activeDashboard.value) return;
      itemsSaveLoading.value = true;
      try {
        const body = editItems.value.map((x, i) => ({
          indicatorId: x.indicatorId,
          label: x.label || null,
          sortOrder: i + 1,
        }));
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/bar-dashboards/${activeDashboard.value.id}/items`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        )) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan item");
        }
        message.success(`${editItems.value.length} indikator tersimpan`);
        isItemsModalOpen.value = false;
        await fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        itemsSaveLoading.value = false;
      }
    };

    const getIndicatorName = (id: number) =>
      indicatorOptions.value.find((x) => x.value === id)?.label ?? `#${id}`;

    fetchIndicatorOptions();
    fetchData(1);

    return {
      tableData,
      loading,
      columns,
      currentPage,
      pageSize,
      total,
      filterYear,
      yearOptions,
      monthOptions,
      handlePageChange,
      handleFilter,
      isModalOpen,
      isEditMode,
      modalLoading,
      formData,
      openModal,
      submitModal,
      isItemsModalOpen,
      itemsModalLoading,
      itemsSaveLoading,
      activeDashboard,
      editItems,
      selectedIndicatorId,
      indicatorOptions,
      openItemsModal,
      addItemToList,
      removeItemFromList,
      moveItem,
      saveItems,
      getIndicatorName,
      currentYear,
    };
  },
});
