import { defineComponent, ref, h } from "vue";
import { useMessage, useDialog, NButton, NDatePicker } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData, saveAuthData, logout } from "@/services/authService";

export default defineComponent({
  setup() {
    const dialog = useDialog();
    const message = useMessage();
    const inputSearch = ref("");
    const tableData = ref([]);
    const current = ref(1);
    const pageSize = ref(20);
    const total = ref(0);
    const loading = ref(false);
    let auth = getAuthData();
    let token = auth?.token;
    let session = auth?.session;

    const fetchData = async (page = 1) => {
      loading.value = true;
      const response = (await apiFetch(
        Config.UrlBackend +
          `/api/fin/group-indicators?page=${page}&pageSize=${pageSize.value}&search=${inputSearch.value}`,
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

    const formData = ref({
      id: null as number | null,
      name: "",
      isActive: true as boolean,
    });

    const openAddModal = () => {
      isEditMode.value = false;
      formData.value = {
        id: null,
        name: "",
        isActive: true,
      };
      isModalOpen.value = true;
    };

    const openEditModal = (row: any) => {
      isEditMode.value = true;
      formData.value = { ...row };
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
              `${Config.UrlBackend}/api/fin/group-indicators/${row.id}`,
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

    const handlePageChange = (page: number) => {
      current.value = page;
      fetchData(page);
    };

    const submitForm = async () => {
      if (isEditMode.value) {
        loading.value = true;
        try {
          const response = (await apiFetch(
            `${Config.UrlBackend}/api/fin/group-indicators/${formData.value.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.value.name,
                isActive: formData.value.isActive,
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
            `${Config.UrlBackend}/api/fin/group-indicators`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.value.name,
                isActive: formData.value.isActive,
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
        title: "Status",
        key: "isActive",
        width: 120,
        render(row: any) {
          return row.isActive ? "✅ Aktif" : "❌ Nonaktif";
        },
      },
    ];

    // Fetch data once created
    fetchData(current.value);

    return {
      columns,
      tableData,
      current,
      pageSize,
      total,
      loading,
      inputSearch,
      handleInputSearch,
      handlePageChange,

      isModalOpen,
      isEditMode,
      formData,
      openAddModal,
      openEditModal,
      closeModal,
      submitForm,
    };
  },
});
