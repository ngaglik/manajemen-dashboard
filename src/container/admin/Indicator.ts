import { defineComponent, ref, computed, h } from "vue";
import { useMessage, useDialog, NButton, NDatePicker } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData, saveAuthData, logout } from "@/services/authService";

export default defineComponent({
  setup() {
    const dialog = useDialog();
    const message = useMessage();
    const inputSearch = ref("");
    const authLogin = getAuthData();
    const isVerifikator = String(authLogin?.employee?.tags ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .includes("VERIFIKATORDASHBOARD");
    const filterOrganizationId = ref<string | null>(
      isVerifikator ? null : (authLogin?.employee?.organizationId ?? null),
    );
    const filterGroupId = ref<number | null>(null);
    const tableData = ref([]);
    const current = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const loading = ref(false);
    let auth = getAuthData();
    let token = auth?.token;
    let session = auth?.session;

    const groupIdOptions = ref<any[]>([]);
    const fetchGroupIdOptions = async () => {
      try {
        const response = (await apiFetch(
          `${Config.UrlBackend}/api/option/group_indicator`,
          { method: "GET" },
        )) as Response;
        if (!response || !response.ok) return;
        const result = await response.json();

        // asumsi response:
        // [{ id: 1, name: 'Suami' }, { id: 2, name: 'Istri' }]
        groupIdOptions.value = (result.data || result).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      } catch (error) {
        console.error(error);
        message.error("Gagal memuat option data");
      }
    };

    const organizationIdOptions = ref<any[]>([]);
    const fetchOrganizationIdOptions = async () => {
      try {
        const response = (await apiFetch(
          `${Config.UrlBackend}/api/option/organization`,
          { method: "GET" },
        )) as Response;
        if (!response || !response.ok) return;
        const result = await response.json();

        // asumsi response:
        // [{ id: '01', name: '...' }, ...]
        let options = (result.data || result).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));

        // Verifikator dashboard: semua unit kerja. Selain itu: unit kerja user saja.
        const auth = getAuthData();
        const tags = String(auth?.employee?.tags ?? "");
        const isVerifikator = tags
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .includes("VERIFIKATORDASHBOARD");

        if (!isVerifikator) {
          const userOrgId = auth?.employee?.organizationId as string | undefined;
          if (userOrgId) {
            options = options.filter((o: any) => o.value === userOrgId);
            // Pastikan unit kerja user tetap muncul walau tidak ada di daftar aktif
            if (!options.some((o: any) => o.value === userOrgId)) {
              options = [{ label: userOrgId, value: userOrgId }, ...options];
            }
          }
        }

        organizationIdOptions.value = options;
      } catch (error) {
        console.error(error);
        message.error("Gagal memuat option unit kerja");
      }
    };

    const fetchData = async (page = 1) => {
      loading.value = true;
      // Susun query hanya dari filter yang terisi supaya API versi lama yang
      // belum mengenal parameter tertentu tetap menerima request-nya.
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize.value));
      if (inputSearch.value) params.set("search", inputSearch.value);
      if (filterOrganizationId.value)
        params.set("organizationId", filterOrganizationId.value);
      if (filterGroupId.value)
        params.set("groupId", String(filterGroupId.value));

      const response = (await apiFetch(
        `${Config.UrlBackend}/api/fin/indicators?${params.toString()}`,
        {
          method: "GET",
        },
      )) as Response;
      if (!response) {
        loading.value = false;
        return;
      }
      const result = await response.json();
      tableData.value = result.data || [];
      current.value = result.page || 1;
      total.value = result.total || 0;
      loading.value = false;
    };

    const isModalOpen = ref(false);
    const isEditMode = ref(false);

    // Filter grup diterapkan juga di sisi klien agar baris yang tampil langsung
    // tersaring walau API yang sedang berjalan belum mendukung parameter groupId.
    // Server tetap memfilter (lihat fetchData) sehingga paginasi tetap akurat
    // ketika API sudah diperbarui.
    const filteredTableData = computed(() => {
      if (!filterGroupId.value) return tableData.value;
      const groupId = filterGroupId.value;
      return (tableData.value as any[]).filter((row) =>
        row.groupIds?.length
          ? row.groupIds.includes(groupId)
          : row.groupId === groupId,
      );
    });

    const criteriaOptions = [
      { label: "Bulan Terakhir", value: "last_month" },
      { label: "Akumulasi", value: "accumulation" },
      { label: "Rata-rata", value: "average" },
    ];

    // ── PIC: daftar pegawai sesuai unit kerja terpilih ──────────────────
    const picOptions = ref<any[]>([]);
    const fetchPicOptions = async (orgId: string | null) => {
      if (!orgId) {
        picOptions.value = [];
        return;
      }
      try {
        const response = (await apiFetch(
          `${Config.UrlBackend}/api/option/employee_by_org?orgId=${encodeURIComponent(orgId)}`,
          { method: "GET" },
        )) as Response;
        if (!response || !response.ok) {
          picOptions.value = [];
          return;
        }
        const result = await response.json();
        picOptions.value = (result.data || []).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      } catch (error) {
        console.error(error);
        picOptions.value = [];
      }
    };

    // Saat unit kerja diganti pengguna: kosongkan PIC & muat ulang opsi.
    const handleOrganizationChange = (orgId: string | null) => {
      formData.value.picId = null;
      fetchPicOptions(orgId);
    };

    const formData = ref({
      id: null as number | null,
      name: "",
      groupIds: [] as number[],
      organizationId: null as string | null,
      picId: null as number | null,
      isActive: true as boolean,
      criteria: "last_month" as string,
    });

    const openAddModal = () => {
      isEditMode.value = false;
      formData.value = {
        id: null,
        name: "",
        groupIds: [],
        organizationId: null,
        picId: null,
        isActive: true,
        criteria: "last_month",
      };
      fetchPicOptions(null);
      isModalOpen.value = true;
    };

    const openEditModal = (row: any) => {
      isEditMode.value = true;
      formData.value = {
        ...row,
        picId: row.picId ?? null,
        groupIds: row.groupIds?.length
          ? row.groupIds
          : row.groupId
            ? [row.groupId]
            : [],
      };
      fetchPicOptions(row.organizationId ?? null);
      isModalOpen.value = true;
    };

    const closeModal = () => {
      isModalOpen.value = false;
    };

    const deleteData = async (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Apakah yakin ingin menghapus data "${row.name}"?`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          loading.value = true;
          try {
            const response = (await apiFetch(
              `${Config.UrlBackend}/api/fin/indicators/${row.id}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )) as Response;

            if (!response || !response.ok) {
              const err = response ? await response.json() : null;
              throw new Error(err?.message || "Gagal menghapus data");
            }

            const result = await response.json();
            message.success(result.message || "Data berhasil dihapus");

            // reload data
            await fetchData(current.value);
          } catch (error) {
            console.error(error);
            message.error((error as Error).message || "Gagal menghapus data");
          } finally {
            loading.value = false;
          }
        },
      });
    };
    const handleInputSearch = () => {
      current.value = 1;
      fetchData(1);
    };

    const handleFilterOrganization = () => {
      current.value = 1;
      fetchData(1);
    };

    const handleFilterGroup = () => {
      current.value = 1;
      fetchData(1);
    };

    const handlePageChange = (page: number) => {
      current.value = page;
      fetchData(page);
    };

    const submitForm = async () => {
      if (!formData.value.name.trim()) {
        message.warning("Nama indikator wajib diisi");
        return;
      }
      if (!formData.value.groupIds || formData.value.groupIds.length === 0) {
        message.warning("Minimal satu grup indikator wajib dipilih");
        return;
      }
      if (isEditMode.value) {
        loading.value = true;
        try {
          const response = (await apiFetch(
            `${Config.UrlBackend}/api/fin/indicators/${formData.value.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.value.name,
                groupIds: formData.value.groupIds,
                organizationId: formData.value.organizationId,
                picId: formData.value.picId,
                isActive: formData.value.isActive,
                criteria: formData.value.criteria,
              }),
            },
          )) as Response;

          if (!response || !response.ok) {
            const err = response ? await response.json() : null;
            throw new Error(err?.message || "Gagal mengupdate data");
          }

          const result = await response.json();
          message.success(result.message || "Data berhasil diupdate");
          await fetchData(current.value);
        } catch (error) {
          console.error(error);
          message.error((error as Error).message || "Gagal mengupdate data");
        } finally {
          loading.value = false;
        }
      } else {
        loading.value = true;
        try {
          const response = (await apiFetch(
            `${Config.UrlBackend}/api/fin/indicators`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.value.name,
                groupIds: formData.value.groupIds,
                organizationId: formData.value.organizationId,
                picId: formData.value.picId,
                isActive: formData.value.isActive,
                criteria: formData.value.criteria,
              }),
            },
          )) as Response;

          if (!response || !response.ok) {
            const err = response ? await response.json() : null;
            throw new Error(err?.message || "Gagal menambah data");
          }

          const result = await response.json();
          message.success(result.message || "Data berhasil ditambah");
          await fetchData(current.value);
        } catch (error) {
          console.error(error);
          message.error((error as Error).message || "Gagal menambah data");
        } finally {
          loading.value = false;
        }
      }
      isModalOpen.value = false;
    };

    const columns = [
      {
        title: "Action",
        key: "actions",
        render(row: any) {
          return h(
            "div",
            {
              style: {
                display: "flex",
                gap: "8px",
              },
            },
            [
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
                  onClick: () => deleteData(row),
                },
                { default: () => "Delete" },
              ),
            ],
          );
        },
      },
      { title: "Name", key: "name" },
      {
        title: "Group(s)",
        key: "groups",
        render(row: any) {
          const names = row.groupNames?.length
            ? row.groupNames
            : row.groupName
              ? [row.groupName]
              : [];
          return names.join(", ") || "—";
        },
      },
      { title: "Unit Kerja", key: "organizationName" },
      {
        title: "PIC",
        key: "picName",
        width: 180,
        ellipsis: { tooltip: true },
        render: (row: any) => row.picName || "—",
      },
      {
        title: "Kriteria",
        key: "criteria",
        width: 140,
        render(row: any) {
          if (row.criteria === "accumulation") return "📊 Akumulasi";
          if (row.criteria === "average") return "⚖️ Rata-rata";
          return "📅 Bulan Terakhir";
        },
      },
      {
        title: "Status",
        key: "isActive",
        width: 120,
        render(row: any) {
          return row.isActive ? "✅ Aktif" : "❌ Nonaktif";
        },
      },
    ];

    fetchGroupIdOptions();
    fetchOrganizationIdOptions();
    // Fetch data once created
    fetchData(current.value);

    return {
      columns,
      tableData,
      filteredTableData,
      current,
      pageSize,
      total,
      loading,
      inputSearch,
      filterOrganizationId,
      handleFilterOrganization,
      filterGroupId,
      handleFilterGroup,
      handleInputSearch,
      handlePageChange,

      isModalOpen,
      isEditMode,
      formData,
      openAddModal,
      openEditModal,
      closeModal,
      submitForm,
      groupIdOptions,
      organizationIdOptions,
      criteriaOptions,
      picOptions,
      handleOrganizationChange,
    };
  },
});
