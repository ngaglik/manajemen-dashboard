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

    const baseUrl = `${Config.UrlBackend}/api/fin/rapat-notulen`;

    const KIND_LABEL: Record<string, string> = {
      undangan: "Undangan",
      presensi: "Presensi",
      notulen: "Notulen",
    };

    type FileKind = "undangan" | "presensi" | "notulen";
    const FILE_KEYS: Record<
      FileKind,
      "undanganFile" | "presensiFile" | "notulenFile"
    > = {
      undangan: "undanganFile",
      presensi: "presensiFile",
      notulen: "notulenFile",
    };

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
      namaKegiatan: "",
      tanggal: null as string | null,
      undanganFile: null as File | null,
      presensiFile: null as File | null,
      notulenFile: null as File | null,
      undanganFileName: "",
      presensiFileName: "",
      notulenFileName: "",
    });

    const formData = ref(initForm());

    const openAddModal = () => {
      isEditMode.value = false;
      formData.value = initForm();
      isModalOpen.value = true;
    };

    const openEditModal = (row: any) => {
      isEditMode.value = true;
      formData.value = {
        id: row.id,
        namaKegiatan: row.namaKegiatan || "",
        tanggal: row.tanggal || null,
        undanganFile: null,
        presensiFile: null,
        notulenFile: null,
        undanganFileName: row.undanganFileName || "",
        presensiFileName: row.presensiFileName || "",
        notulenFileName: row.notulenFileName || "",
      };
      isModalOpen.value = true;
    };

    const closeModal = () => {
      isModalOpen.value = false;
    };

    const handleFileChange =
      (kind: FileKind) => (options: any) => {
        const file = options?.file?.file;
        const key = FILE_KEYS[kind];
        formData.value[key] = file || null;
        if (file && !/\.pdf$/i.test(file.name)) {
          message.warning("File harus berformat PDF");
          formData.value[key] = null;
        }
      };

    const submitForm = async () => {
      if (!formData.value.namaKegiatan.trim()) {
        message.warning("Nama kegiatan wajib diisi");
        return;
      }
      const tanggal = toDateStr(formData.value.tanggal);
      if (!tanggal) {
        message.warning("Tanggal tidak valid");
        return;
      }
      if (!isEditMode.value) {
        if (!formData.value.undanganFile) {
          message.warning("Dokumen undangan wajib diunggah");
          return;
        }
        if (!formData.value.presensiFile) {
          message.warning("Dokumen presensi wajib diunggah");
          return;
        }
        if (!formData.value.notulenFile) {
          message.warning("Dokumen notulen wajib diunggah");
          return;
        }
      }

      formLoading.value = true;
      try {
        const fd = new FormData();
        fd.append("namaKegiatan", formData.value.namaKegiatan.trim());
        fd.append("tanggal", tanggal);
        fd.append("createdBy", auth?.username ?? "system");
        fd.append("updatedBy", auth?.username ?? "system");
        if (formData.value.undanganFile)
          fd.append("undangan", formData.value.undanganFile);
        if (formData.value.presensiFile)
          fd.append("presensi", formData.value.presensiFile);
        if (formData.value.notulenFile)
          fd.append("notulen", formData.value.notulenFile);

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
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Apakah yakin ingin menghapus notulensi "${row.namaKegiatan}"?`,
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
    // PREVIEW PDF (undangan / presensi / notulen)
    // ══════════════════════════════════════════════════════════════════
    const isPreviewOpen = ref(false);
    const previewName = ref("");
    const previewUrl = ref("");

    const getFileBlob = async (row: any, kind: string) => {
      const res = (await apiFetch(`${baseUrl}/${row.id}/${kind}`, {
        method: "GET",
      })) as Response;
      if (!res || !res.ok) throw new Error("Gagal memuat dokumen");
      return await res.blob();
    };

    const previewFile = async (row: any, kind: string) => {
      try {
        const blob = await getFileBlob(row, kind);
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = URL.createObjectURL(blob);
        previewName.value = `${row.namaKegiatan || "Rapat"} — ${KIND_LABEL[kind]}`;
        isPreviewOpen.value = true;
      } catch (error) {
        message.error((error as Error).message || "Gagal memuat dokumen");
      }
    };

    const downloadFile = async (row: any, kind: string) => {
      try {
        const blob = await getFileBlob(row, kind);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = row[`${kind}FileName`] || `${kind}-${row.id}.pdf`;
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
    const docCell = (kind: string) => ({
      title: KIND_LABEL[kind],
      key: `${kind}FileName`,
      width: 160,
      ellipsis: { tooltip: true },
      render(row: any) {
        const fileName = row[`${kind}FileName`];
        if (!fileName) return "—";
        return h(
          NButton,
          {
            size: "small",
            text: true,
            type: "info",
            onClick: () => previewFile(row, kind),
          },
          { default: () => fileName },
        );
      },
    });

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
        title: "Tanggal",
        key: "tanggal",
        width: 120,
        render(row: any) {
          return formatTanggal(row.tanggal);
        },
      },
      { title: "Nama Kegiatan", key: "namaKegiatan" },
      docCell("undangan"),
      docCell("presensi"),
      docCell("notulen"),
      {
        title: "Aksi",
        key: "actions",
        width: 150,
        render(row: any) {
          return h(
            "div",
            { style: { display: "flex", gap: "6px" } },
            [
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
            ],
          );
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
