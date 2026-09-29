import { defineComponent, ref, h } from "vue";
import { useMessage, useDialog, NButton, NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();

    const auth = getAuthData();
    const isVerifikator = String(auth?.employee?.tags ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .includes("VERIFIKATORDASHBOARD");

    // Hanya user dengan tag ADMINDASHBOARD yang boleh menambah/mengubah/menghapus
    const isAdmin = String(auth?.employee?.tags ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .includes("ADMINDASHBOARD");

    const baseUrl = `${Config.UrlBackend}/api/fin/bank-sops`;

    // ══════════════════════════════════════════════════════════════════
    // LIST DATA & FILTER
    // ══════════════════════════════════════════════════════════════════
    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const current = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const inputSearch = ref("");
    const filterOrganizationId = ref<string | null>(
      isVerifikator ? null : (auth?.employee?.organizationId ?? null),
    );

    const organizationIdOptions = ref<any[]>([]);
    const fetchOrganizationIdOptions = async () => {
      try {
        const response = (await apiFetch(
          `${Config.UrlBackend}/api/option/organization`,
          { method: "GET" },
        )) as Response;
        if (!response || !response.ok) return;
        const result = await response.json();

        let options = (result.data || result).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));

        // Verifikator: semua unit kerja. Selain itu: unit kerja user saja.
        if (!isVerifikator) {
          const userOrgId = auth?.employee?.organizationId as string | undefined;
          if (userOrgId) {
            options = options.filter((o: any) => o.value === userOrgId);
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
      try {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize.value}`;
        if (inputSearch.value.trim())
          url += `&search=${encodeURIComponent(inputSearch.value.trim())}`;
        if (filterOrganizationId.value)
          url += `&organizationId=${encodeURIComponent(filterOrganizationId.value)}`;

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

    const handleFilterOrganization = () => {
      current.value = 1;
      fetchData(1);
      refreshDocSummary();
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
    // NOTIFIKASI USIA DOKUMEN
    // Ambang usia (bulan): < 30 aman; 30–35 Peringatan Awal;
    // 36–41 Perlu Ditinjau Kembali (Peringatan Utama); ≥ 42 Peringatan
    // Kritis (usia > 3 tahun tanpa tindakan — risiko hukum).
    // ══════════════════════════════════════════════════════════════════
    const docSummary = ref({ awal: 0, utama: 0, kritis: 0 });

    function getDocWarning(tanggalPembuatan?: string | null): {
      level: "awal" | "utama" | "kritis";
      label: string;
      tooltip: string;
      type: "warning" | "error";
      color?: { color: string; textColor: string; borderColor: string };
    } | null {
      if (!tanggalPembuatan) return null;
      const d = new Date(`${String(tanggalPembuatan).slice(0, 10)}T00:00:00`);
      if (isNaN(d.getTime())) return null;
      const now = new Date();
      let months =
        (now.getFullYear() - d.getFullYear()) * 12 +
        (now.getMonth() - d.getMonth());
      if (now.getDate() < d.getDate()) months -= 1;
      if (months < 30) return null; // < 2,5 tahun — aman
      if (months < 36)
        return {
          level: "awal",
          label: "Peringatan Awal",
          tooltip:
            "Dokumen berusia ≥ 2,5 tahun — segera jadwalkan peninjauan kembali",
          type: "warning",
        };
      if (months < 42)
        return {
          level: "utama",
          label: "Perlu Ditinjau Kembali",
          tooltip:
            "Peringatan Utama — dokumen berusia ≥ 3 tahun dan wajib ditinjau/diperbarui",
          type: "error",
        };
      return {
        level: "kritis",
        label: "Peringatan Kritis",
        tooltip:
          "Dokumen berusia > 3 tahun tanpa tindakan — berpotensi menimbulkan risiko hukum",
        type: "error",
        color: { color: "#b91c1c", textColor: "#fff", borderColor: "#b91c1c" },
      };
    }

    // Ambil seluruh dokumen (loop semua halaman, hormati filter unit
    // kerja) untuk menghitung ringkasan notifikasi secara akurat.
    const fetchAllDocs = async (): Promise<any[]> => {
      const all: any[] = [];
      let page = 1;
      const pageSize = 500;
      let total = Infinity;
      while (all.length < total && page <= 50) {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize}`;
        if (filterOrganizationId.value)
          url += `&organizationId=${encodeURIComponent(filterOrganizationId.value)}`;
        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) break;
        const result = await res.json();
        const rows = result.data || [];
        all.push(...rows);
        total = result.total ?? all.length;
        page++;
        if (rows.length === 0) break;
      }
      return all;
    };

    const refreshDocSummary = async () => {
      try {
        const rows = await fetchAllDocs();
        docSummary.value = {
          awal: rows.filter((r) => getDocWarning(r.tanggalPembuatan)?.level === "awal").length,
          utama: rows.filter((r) => getDocWarning(r.tanggalPembuatan)?.level === "utama").length,
          kritis: rows.filter((r) => getDocWarning(r.tanggalPembuatan)?.level === "kritis").length,
        };
      } catch {
        /* silent */
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // FORM ADD/EDIT MODAL
    // ══════════════════════════════════════════════════════════════════
    const isModalOpen = ref(false);
    const isEditMode = ref(false);
    const formLoading = ref(false);

    const initForm = () => {
      const now = new Date();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const today = `${now.getFullYear()}-${m}-${day}`;
      return {
        id: null as number | null,
        nomor: "",
        tanggalPembuatan: today as string | null,
        judul: "",
        organizationId: (isVerifikator
          ? null
          : (auth?.employee?.organizationId ?? null)) as string | null,
        fileName: "",
        file: null as File | null,
      };
    };

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
        nomor: row.nomor || "",
        tanggalPembuatan: row.tanggalPembuatan || null,
        judul: row.judul || "",
        organizationId: row.organizationId || null,
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
      if (!formData.value.judul.trim()) {
        message.warning("Judul wajib diisi");
        return;
      }
      if (!formData.value.tanggalPembuatan) {
        message.warning("Tanggal pembuatan wajib diisi");
        return;
      }
      const tanggal = toDateStr(formData.value.tanggalPembuatan);
      if (!tanggal) {
        message.warning("Tanggal pembuatan tidak valid");
        return;
      }
      if (!formData.value.organizationId) {
        message.warning("Unit kerja wajib diisi");
        return;
      }
      if (!isEditMode.value && !formData.value.file) {
        message.warning("Dokumen PDF wajib dipilih");
        return;
      }

      formLoading.value = true;
      try {
        const fd = new FormData();
        fd.append("nomor", formData.value.nomor.trim());
        fd.append("tanggalPembuatan", tanggal);
        fd.append("judul", formData.value.judul.trim());
        fd.append("organizationId", formData.value.organizationId);
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
        refreshDocSummary();
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
        content: `Apakah yakin ingin menghapus SOP "${row.judul}"?`,
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
            refreshDocSummary();
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
        previewName.value = row.judul || row.fileName || "Preview SOP";
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
        a.download = row.fileName || `sop-${row.id}.pdf`;
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
      { title: "Nomor", key: "nomor", width: 130 },
      { title: "Judul", key: "judul" },
      {
        title: "Tanggal Pembuatan",
        key: "tanggalPembuatan",
        width: 140,
        render(row: any) {
          return formatTanggal(row.tanggalPembuatan);
        },
      },
      { title: "Unit Kerja", key: "organizationName", width: 200 },
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
        title: "Peringatan",
        key: "warning",
        width: 170,
        render(row: any) {
          const w = getDocWarning(row.tanggalPembuatan);
          if (!w) return "—";
          return h("span", { title: w.tooltip }, [
            h(
              NTag,
              {
                size: "small",
                type: w.type,
                ...(w.color ? { color: w.color } : {}),
              },
              { default: () => w.label },
            ),
          ]);
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

    fetchOrganizationIdOptions();
    fetchData(current.value);
    refreshDocSummary();

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
      docSummary,
      filterOrganizationId,
      organizationIdOptions,
      handleFilterOrganization,
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
