import { defineComponent, ref, h } from "vue";
import { useMessage, useDialog, NButton } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    // Hanya user dengan tag ADMINDASHBOARD yang boleh menambah/mengubah/menghapus
    const isAdmin = String(auth?.employee?.tags ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .includes("ADMINDASHBOARD");

    const baseUrl = `${Config.UrlBackend}/api/fin/dewas-recommendations`;

    // ══════════════════════════════════════════════════════════════════
    // LIST DATA & FILTER
    // ══════════════════════════════════════════════════════════════════
    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const current = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const inputSearch = ref("");

    const fetchData = async (page = 1) => {
      loading.value = true;
      try {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize.value}`;
        if (inputSearch.value.trim())
          url += `&search=${encodeURIComponent(inputSearch.value.trim())}`;

        const response = (await apiFetch(url, { method: "GET" })) as Response;
        if (!response || !response.ok) throw new Error("Gagal memuat data");
        const result = await response.json();
        tableData.value = result.data || [];
        current.value = result.page || 1;
        total.value = result.total || 0;
      } catch (error) {
        message.error((error as Error).message || "Gagal memuat data");
      } finally {
        loading.value = false;
      }
    };

    const handleInputSearch = () => {
      current.value = 1;
      fetchData(1);
    };

    const handlePageChange = (page: number) => {
      current.value = page;
      fetchData(page);
    };

    const formatTanggal = (v: any) => {
      if (!v) return "-";
      const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString("id-ID");
    };

    // Naive UI date-picker dapat mengeluarkan timestamp (number);
    // normalisasi ke format yyyy-MM-dd sebelum dikirim.
    const toDateStr = (v: any): string | null => {
      if (!v) return null;
      if (typeof v === "number") {
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${m}-${day}`;
      }
      return String(v).slice(0, 10);
    };

    // ══════════════════════════════════════════════════════════════════
    // FORM ADD/EDIT MODAL
    // ══════════════════════════════════════════════════════════════════
    const isModalOpen = ref(false);
    const isEditMode = ref(false);
    const formLoading = ref(false);

    const initForm = () => ({
      id: null as number | null,
      tanggalKegiatan: null as string | null,
      namaKegiatan: "",
      fileName: "",
      file: null as File | null,
    });

    const formData = ref(initForm());

    const openAddModal = () => {
      if (!isAdmin) {
        message.warning("Anda hanya dapat melihat dokumen (preview)");
        return;
      }
      isEditMode.value = false;
      formData.value = initForm();
      isModalOpen.value = true;
    };

    const openEditModal = (row: any) => {
      if (!isAdmin) {
        message.warning("Anda hanya dapat melihat dokumen (preview)");
        return;
      }
      isEditMode.value = true;
      formData.value = {
        id: row.id,
        tanggalKegiatan: row.tanggalKegiatan || null,
        namaKegiatan: row.namaKegiatan || "",
        fileName: row.fileName || "",
        file: null,
      };
      isModalOpen.value = true;
    };

    const closeModal = () => {
      isModalOpen.value = false;
    };

    const handleFileChange = (options: any) => {
      const file = options?.file?.file;
      formData.value.file = file || null;
      if (file && !/\.pdf$/i.test(file.name)) {
        message.warning("File harus berformat PDF");
        formData.value.file = null;
      }
    };

    const submitForm = async () => {
      if (!isAdmin) {
        message.warning("Anda hanya dapat melihat dokumen (preview)");
        return;
      }
      if (!formData.value.tanggalKegiatan) {
        message.warning("Tanggal kegiatan wajib diisi");
        return;
      }
      const tanggal = toDateStr(formData.value.tanggalKegiatan);
      if (!tanggal) {
        message.warning("Tanggal kegiatan tidak valid");
        return;
      }
      if (!formData.value.namaKegiatan.trim()) {
        message.warning("Nama kegiatan wajib diisi");
        return;
      }
      if (!isEditMode.value && !formData.value.file) {
        message.warning("Dokumen PDF wajib dipilih");
        return;
      }

      formLoading.value = true;
      try {
        const fd = new FormData();
        fd.append("tanggalKegiatan", tanggal);
        fd.append("namaKegiatan", formData.value.namaKegiatan.trim());
        fd.append("createdBy", auth?.username ?? "system");
        fd.append("updatedBy", auth?.username ?? "system");
        if (formData.value.file) fd.append("file", formData.value.file);

        const url = isEditMode.value
          ? `${baseUrl}/${formData.value.id}`
          : baseUrl;
        const method = isEditMode.value ? "PUT" : "POST";

        // Body FormData: jangan set Content-Type (browser menambah boundary)
        const response = (await apiFetch(url, { method, body: fd })) as Response;

        if (!response || !response.ok) {
          const err = response ? await response.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        message.success(
          isEditMode.value ? "Data berhasil diperbarui" : "Data berhasil disimpan",
        );
        isModalOpen.value = false;
        await fetchData(current.value);
      } catch (error) {
        message.error((error as Error).message || "Gagal menyimpan data");
      } finally {
        formLoading.value = false;
      }
    };

    const deleteData = async (row: any) => {
      if (!isAdmin) {
        message.warning("Anda hanya dapat melihat dokumen (preview)");
        return;
      }
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Apakah yakin ingin menghapus rekomendasi "${row.namaKegiatan}"?`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const response = (await apiFetch(`${baseUrl}/${row.id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            })) as Response;

            if (!response || !response.ok) {
              const err = response ? await response.json() : null;
              throw new Error(err?.message || "Gagal menghapus data");
            }

            message.success("Data berhasil dihapus");
            await fetchData(current.value);
          } catch (error) {
            message.error((error as Error).message || "Gagal menghapus data");
          }
        },
      });
    };

    // ══════════════════════════════════════════════════════════════════
    // PREVIEW & DOWNLOAD PDF
    // ══════════════════════════════════════════════════════════════════
    const isPreviewOpen = ref(false);
    const previewName = ref("");
    const previewUrl = ref("");

    const getFileBlob = async (row: any) => {
      const res = (await apiFetch(`${baseUrl}/${row.id}/file`, {
        method: "GET",
      })) as Response;
      if (!res || !res.ok) throw new Error("Gagal memuat dokumen");
      return await res.blob();
    };

    const previewFile = async (row: any) => {
      try {
        const blob = await getFileBlob(row);
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = URL.createObjectURL(blob);
        previewName.value = row.namaKegiatan || row.fileName || "Preview Dokumen";
        isPreviewOpen.value = true;
      } catch (error) {
        message.error((error as Error).message || "Gagal memuat dokumen");
      }
    };

    const downloadFile = async (row: any) => {
      try {
        const blob = await getFileBlob(row);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = row.fileName || `dewas-rekomendasi-${row.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (error) {
        message.error((error as Error).message || "Gagal mengunduh dokumen");
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // KOLOM TABEL
    // ══════════════════════════════════════════════════════════════════
    const columns = [
      {
        title: "No",
        key: "no",
        width: 50,
        render(_: any, index: number) {
          return index + 1;
        },
      },
      {
        title: "Tanggal Kegiatan",
        key: "tanggalKegiatan",
        width: 140,
        render(row: any) {
          return formatTanggal(row.tanggalKegiatan);
        },
      },
      { title: "Nama Kegiatan", key: "namaKegiatan" },
      {
        title: "Dokumen",
        key: "fileName",
        width: 200,
        ellipsis: { tooltip: true },
        render(row: any) {
          return row.fileName ? row.fileName : "-";
        },
      },
      {
        title: "Aksi",
        key: "actions",
        width: 200,
        render(row: any) {
          const actions = [
            h(
              NButton,
              { size: "small", type: "info", onClick: () => previewFile(row) },
              { default: () => "Preview" },
            ),
          ];
          if (isAdmin) {
            actions.push(
              h(
                NButton,
                { size: "small", type: "primary", onClick: () => openEditModal(row) },
                { default: () => "Edit" },
              ),
              h(
                NButton,
                { size: "small", type: "error", onClick: () => deleteData(row) },
                { default: () => "Hapus" },
              ),
            );
          }
          return h("div", { style: { display: "flex", gap: "6px" } }, actions);
        },
      },
    ];

    fetchData(current.value);

    return {
      columns,
      tableData,
      loading,
      current,
      pageSize,
      total,
      inputSearch,
      handleInputSearch,
      handlePageChange,
      isModalOpen,
      isEditMode,
      formData,
      formLoading,
      isAdmin,
      openAddModal,
      openEditModal,
      closeModal,
      handleFileChange,
      submitForm,
      isPreviewOpen,
      previewName,
      previewUrl,
      downloadFile,
    };
  },
});
