import { defineComponent, ref, computed, h } from "vue";
import {
  useMessage,
  useDialog,
  NButton,
  NInputNumber,
  NInput,
  NCheckbox,
  NTag,
  NUpload,
} from "naive-ui";
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

    // ── Hak akses menu Capaian Indikator ───────────────────────────
    // VERIFIKATORDASHBOARD : full CRUD + verifikasi
    // ADMINDASHBOARD       : full CRUD tanpa verifikasi
    // selain itu           : menu disembunyikan (guard route)
    const tags = String(auth?.employee?.tags ?? "")
      .split(",")
      .map((t) => t.trim().toUpperCase());
    const isVerifikator = tags.includes("VERIFIKATORDASHBOARD");
    const isAdmin = tags.includes("ADMINDASHBOARD");
    const canCrud = isVerifikator || isAdmin;

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

    // ── Organization (Unit Kerja) options ────────────────────────────
    const organizationIdOptions = ref<{ label: string; value: string }[]>([]);
    const fetchOrganizationIdOptions = async () => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/option/organization`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();

        let options = (result.data || result).map((item: any) => ({
          label: item.name,
          value: item.id,
        }));

        // Verifikator dashboard: semua unit kerja. Selain itu (termasuk
        // ADMINDASHBOARD): unit kerja user saja.
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
    const filterOrgIdInput = ref<string | null>(
      isVerifikator ? null : (auth?.employee?.organizationId ?? null),
    );

    // Helper: daftar id grup milik sebuah baris (dukung relasi many-to-many)
    const groupIdsOf = (x: any): number[] => {
      if (Array.isArray(x?.groupIds) && x.groupIds.length) return x.groupIds;
      return x?.groupId ? [x.groupId] : [];
    };
    const groupNamesOf = (x: any): string[] => {
      if (Array.isArray(x?.groupNames) && x.groupNames.length) return x.groupNames;
      return x?.groupName ? [x.groupName] : [];
    };

    // Filtered view untuk tabel input (client-side)
    const filteredPeriodItems = computed(() => {
      if (!filterGroupIdInput.value) return periodItems.value;
      return periodItems.value.filter((x) =>
        groupIdsOf(x).includes(filterGroupIdInput.value as number),
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
          `${Config.UrlBackend}/api/fin/indicator-achievements/period/${selectedYear.value}/${selectedMonth.value}?organizationId=${filterOrgIdInput.value ?? ""}`,
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
        // Tandai baris yang memiliki file tertahan (lampiran/evaluasi)
        const periodKey = `${selectedYear.value}-${selectedMonth.value}-`;
        for (const item of periodItems.value) {
          for (const kind of Object.keys(FILE_KINDS) as FileKind[]) {
            const pf =
              pendingFiles.value[periodKey + item.indicatorId + `-${kind}`];
            if (pf) item[FILE_KINDS[kind].pendingField] = pf.name;
          }
        }
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
      if (!canCrud) return;
      if (row.isVerified) return; // data terverifikasi tidak boleh diubah
      if (row.inputValue === null || row.inputValue === undefined || row.inputValue === "") {
        return;
      }

      if (saveTimers[row.indicatorId]) {
        clearTimeout(saveTimers[row.indicatorId]);
      }

      saveTimers[row.indicatorId] = setTimeout(async () => {
        await doSaveRow(row);
        delete saveTimers[row.indicatorId];
      }, 600);
    };

    const saveBatch = async () => {
      if (!canCrud) {
        message.warning("Anda tidak memiliki akses untuk menyimpan capaian");
        return;
      }
      const items = periodItems.value
        .filter(
          (x) =>
            !x.isVerified &&
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

    // ── Toggle verifikasi (checkbox) ──────────────────────────────────
    const toggleVerification = async (row: any) => {
      const achievementId = row.achievementId ?? row.id;
      if (!achievementId) return;
      if (!isVerifikator) {
        message.warning("Hanya verifikator yang dapat melakukan verifikasi");
        return;
      }

      const nextValue = !row.isVerified;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/fin/indicator-achievements/${achievementId}/verification`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isVerified: nextValue,
              updatedBy: auth?.username ?? "system",
            }),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengubah verifikasi");
        }

        row.isVerified = nextValue;
        message.success(
          nextValue ? "Data berhasil diverifikasi" : "Verifikasi dibatalkan",
        );
      } catch (err) {
        message.error((err as Error).message || "Gagal mengubah verifikasi");
      }
    };

    // ── Lampiran & file evaluasi capaian ──────────────────────────────
    const ALLOWED_ATTACH_RE = /\.(pdf|png|jpe?g|xlsx?|docx?)$/i;
    const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // 10 MB

    type FileKind = "attachment" | "evaluation";

    // Konfigurasi per jenis file: endpoint & nama field pada baris data
    const FILE_KINDS: Record<
      FileKind,
      {
        endpoint: string;
        nameField: string;
        sizeField: string;
        uploadedAtField: string;
        uploadedByField: string;
        pendingField: string;
        label: string;
        pickLabel: string;
        replaceLabel: string;
      }
    > = {
      attachment: {
        endpoint: "attachment",
        nameField: "attachmentFileName",
        sizeField: "attachmentSize",
        uploadedAtField: "attachmentUploadedAt",
        uploadedByField: "attachmentUploadedBy",
        pendingField: "pendingAttachment",
        label: "Lampiran",
        pickLabel: "⬆ Pilih File",
        replaceLabel: "🔄 Ganti File",
      },
      evaluation: {
        endpoint: "evaluation",
        nameField: "evaluationFileName",
        sizeField: "evaluationSize",
        uploadedAtField: "evaluationUploadedAt",
        uploadedByField: "evaluationUploadedBy",
        pendingField: "pendingEvaluation",
        label: "File Evaluasi",
        pickLabel: "⬆ Pilih Evaluasi",
        replaceLabel: "🔄 Ganti Evaluasi",
      },
    };

    const uploadingKey = ref<string | null>(null); // `${kind}-${achievementId}`
    // Menyebabkan kontrol upload di-remount setelah satu percobaan selesai,
    // sehingga pemilihan file yang sama tetap memicu event change berikutnya.
    const uploadAttempts = ref(0);
    // File terpilih untuk baris yang nilainya belum tersimpan
    const pendingFiles = ref<Record<string, File>>({});

    const pendingKey = (indicatorId: number, kind: FileKind) =>
      `${selectedYear.value}-${selectedMonth.value}-${indicatorId}-${kind}`;

    const validateAttachmentFile = (file: File): string | null => {
      if (!ALLOWED_ATTACH_RE.test(file.name)) {
        return "Format file tidak didukung (PDF, PNG, JPG, XLSX, XLS, DOC, DOCX)";
      }
      if (file.size > MAX_ATTACH_BYTES) {
        return "Ukuran file maksimal 10 MB";
      }
      return null;
    };

    // Simpan nilai satu baris segera (dipakai autosave & sebelum unggah file)
    const doSaveRow = async (row: any): Promise<boolean> => {
      if (!canCrud) return false;
      if (row.isVerified) return false; // data terverifikasi tidak boleh diubah
      if (
        row.inputValue === null ||
        row.inputValue === undefined ||
        row.inputValue === ""
      ) {
        return false;
      }
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

        // Unggah otomatis file tertahan (lampiran/evaluasi) untuk indikator ini
        for (const kind of Object.keys(FILE_KINDS) as FileKind[]) {
          const pKey = pendingKey(row.indicatorId, kind);
          const pending = pendingFiles.value[pKey];
          if (!pending) continue;
          delete pendingFiles.value[pKey];
          const fresh = periodItems.value.find(
            (x: any) => x.indicatorId === row.indicatorId,
          );
          if (fresh && (fresh.achievementId ?? fresh.id)) {
            await uploadAttachment(fresh, pending, kind);
          } else {
            pendingFiles.value[pKey] = pending;
          }
        }
        return true;
      } catch (err) {
        message.error((err as Error).message || "Gagal menyimpan");
        return false;
      } finally {
        savingItemId.value = null;
      }
    };

    const attachmentBase = (id: number, kind: FileKind) =>
      `${Config.UrlBackend}/api/fin/indicator-achievements/${id}/${FILE_KINDS[kind].endpoint}`;

    const uploadAttachment = async (
      row: any,
      file: File,
      kind: FileKind = "attachment",
    ): Promise<boolean> => {
      const cfg = FILE_KINDS[kind];
      const achievementId = row.achievementId ?? row.id;
      if (!canCrud || !achievementId) return false;
      const invalid = validateAttachmentFile(file);
      if (invalid) {
        message.warning(invalid);
        return false;
      }

      uploadingKey.value = `${kind}-${achievementId}`;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("uploadedBy", auth?.username ?? "system");

        const res = (await apiFetch(attachmentBase(achievementId, kind), {
          method: "POST",
          body: fd,
        })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(
            err?.message || `Gagal mengunggah ${cfg.label.toLowerCase()}`,
          );
        }

        const result = await res.json();
        const data = result.data || {};
        row[cfg.nameField] = data[cfg.nameField] ?? file.name;
        row[cfg.sizeField] = data[cfg.sizeField] ?? file.size;
        row[cfg.uploadedAtField] =
          data[cfg.uploadedAtField] ?? new Date().toISOString();
        row[cfg.uploadedByField] = data[cfg.uploadedByField] ?? auth?.username;
        row[cfg.pendingField] = null;
        message.success(`${cfg.label} berhasil diunggah`);
        return true;
      } catch (err) {
        message.error(
          (err as Error).message || `Gagal mengunggah ${cfg.label.toLowerCase()}`,
        );
        return false;
      } finally {
        uploadingKey.value = null;
      }
    };

    const downloadAttachment = async (
      row: any,
      kind: FileKind = "attachment",
    ) => {
      const cfg = FILE_KINDS[kind];
      const achievementId = row.achievementId ?? row.id;
      if (!achievementId) return;
      try {
        const res = (await apiFetch(attachmentBase(achievementId, kind), {
          method: "GET",
        })) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(
            err?.message || `Gagal mengunduh ${cfg.label.toLowerCase()}`,
          );
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = row[cfg.nameField] || cfg.label.toLowerCase();
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        message.error(
          (err as Error).message || `Gagal mengunduh ${cfg.label.toLowerCase()}`,
        );
      }
    };

    // Dipanggil saat user memilih file: unggah langsung bila record capaian
    // sudah ada; bila belum, simpan nilai dulu (jika terisi) atau tahan file
    // lalu unggah otomatis begitu nilai disimpan.
    const onPickAttachment = async (
      row: any,
      file: File,
      kind: FileKind = "attachment",
    ) => {
      const cfg = FILE_KINDS[kind];
      uploadAttempts.value++;
      if (!canCrud) return;
      const achievementId = row.achievementId ?? row.id;
      if (achievementId) {
        await uploadAttachment(row, file, kind);
        uploadAttempts.value++;
        return;
      }
      const hasValue =
        row.inputValue !== null &&
        row.inputValue !== undefined &&
        row.inputValue !== "";
      if (hasValue) {
        const saved = await doSaveRow(row);
        uploadAttempts.value++;
        if (saved) {
          const fresh = periodItems.value.find(
            (x: any) => x.indicatorId === row.indicatorId,
          );
          if (fresh && (fresh.achievementId ?? fresh.id)) {
            await uploadAttachment(fresh, file, kind);
          }
        }
        return;
      }
      // Belum ada nilai — tahan file, otomatis diunggah setelah nilai disimpan
      pendingFiles.value[pendingKey(row.indicatorId, kind)] = file;
      row[cfg.pendingField] = file.name;
      uploadAttempts.value++;
      message.info(
        `File ${cfg.label.toLowerCase()} ditahan — otomatis diunggah setelah nilai capaian disimpan.`,
      );
    };

    // Hapus file terunggah, atau batalkan file yang masih ditahan
    const deleteAttachment = (row: any, kind: FileKind = "attachment") => {
      const cfg = FILE_KINDS[kind];
      const achievementId = row.achievementId ?? row.id;
      if (!achievementId) {
        // File masih ditahan (nilai belum tersimpan) — cukup batalkan di lokal
        const pKey = pendingKey(row.indicatorId, kind);
        delete pendingFiles.value[pKey];
        row[cfg.pendingField] = null;
        uploadAttempts.value++;
        message.success(`File ${cfg.label.toLowerCase()} dibatalkan`);
        return;
      }
      if (!canCrud) return;
      dialog.warning({
        title: `Hapus ${cfg.label}`,
        content: `Hapus ${cfg.label.toLowerCase()} "${row[cfg.nameField] ?? "file"}"? Data capaian tetap tersimpan.`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(attachmentBase(achievementId, kind), {
              method: "DELETE",
            })) as Response;
            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(
                err?.message || `Gagal menghapus ${cfg.label.toLowerCase()}`,
              );
            }
            row[cfg.nameField] = null;
            row[cfg.sizeField] = null;
            row[cfg.uploadedAtField] = null;
            row[cfg.uploadedByField] = null;
            message.success(`${cfg.label} berhasil dihapus`);
          } catch (err) {
            message.error(
              (err as Error).message ||
                `Gagal menghapus ${cfg.label.toLowerCase()}`,
            );
          }
        },
      });
    };

    // Render sel file (lampiran / file evaluasi) untuk tabel input & riwayat
    const renderAttachmentCell = (row: any, kind: FileKind = "attachment") => {
      const cfg = FILE_KINDS[kind];
      const achievementId = row.achievementId ?? row.id;
      const uploading = uploadingKey.value === `${kind}-${achievementId}`;
      const hasFile = !!row[cfg.nameField];
      const pendingName = row[cfg.pendingField] || null;

      const statusNode = hasFile
        ? h(
            NButton,
            {
              size: "tiny",
              type: "info",
              quaternary: true,
              onClick: () => downloadAttachment(row, kind),
            },
            { default: () => `⬇ ${row[cfg.nameField]}` },
          )
        : pendingName
          ? h(
              "span",
              { style: { color: "#e6a23c", fontSize: "12px" } },
              `📎 ${pendingName}`,
            )
          : h(
              "span",
              { style: { color: "#aaa", fontSize: "12px" } },
              achievementId ? "belum ada" : "belum tersimpan",
            );

      const uploadNode = canCrud
        ? h(
            NUpload,
            {
              key: `${kind}-${row.indicatorId}-${uploadAttempts.value}`,
              showFileList: false,
              accept: ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx",
              defaultUpload: false,
              max: 1,
              disabled: uploading,
              onChange: (opts: any) => {
                const file = opts?.file?.file;
                if (file) onPickAttachment(row, file, kind);
              },
            },
            {
              default: () =>
                h(
                  NButton,
                  {
                    size: "small",
                    secondary: true,
                    disabled: uploading,
                    title: uploading
                      ? "Mengunggah…"
                      : hasFile
                        ? `Ganti ${cfg.label.toLowerCase()}`
                        : `Unggah ${cfg.label.toLowerCase()}`,
                  },
                  {
                    default: () =>
                      uploading
                        ? "⏳ Mengunggah…"
                        : hasFile
                          ? cfg.replaceLabel
                          : cfg.pickLabel,
                  },
                ),
            },
          )
        : null;

      const deleteNode =
        canCrud && (hasFile || pendingName)
          ? h(
              NButton,
              {
                size: "tiny",
                type: "error",
                tertiary: true,
                disabled: uploading,
                title: hasFile
                  ? `Hapus ${cfg.label.toLowerCase()}`
                  : "Batalkan file yang dipilih",
                onClick: () => deleteAttachment(row, kind),
              },
              { default: () => "🗑" },
            )
          : null;

      return h(
        "div",
        {
          style: {
            display: "flex",
            gap: "4px",
            alignItems: "center",
            flexWrap: "wrap",
            minWidth: "170px",
          },
        },
        [statusNode, uploadNode, deleteNode].filter(Boolean),
      );
    };

    // ── Interpretasi capaian vs target ───────────────────────────────────
    // Target berasal dari Pengaturan KPI tahun periode (dikirim endpoint
    // period sebagai targetValue). Penilaian memakai nilai yang sedang diisi
    // sehingga kolom ini ikut berubah otomatis saat pengguna mengetik.
    const fmtNum = (v: number) => v.toLocaleString("id-ID");

    const toNumberOrNull = (v: any): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };

    type Interpretasi = {
      status: "empty" | "no-target" | "reached" | "missed";
      label: string;
      detail: string;
    };

    const interpretCapaian = (row: any): Interpretasi => {
      const value = toNumberOrNull(row?.inputValue);
      const target = toNumberOrNull(row?.targetValue);

      if (value === null) {
        return {
          status: "empty",
          label: "—",
          detail: "Capaian belum diisi",
        };
      }
      if (target === null) {
        return {
          status: "no-target",
          label: "Tanpa target",
          detail: "Target belum diatur di Pengaturan KPI",
        };
      }

      // Konjungsi menentukan arah penilaian: ">=" (default) tercapai bila
      // nilai ≥ target, "<=" tercapai bila nilai ≤ target (semakin kecil baik).
      const lowerIsBetter = row?.conjunction === "<=";
      const reached = lowerIsBetter ? value <= target : value >= target;
      // Rasio capaian untuk indikator "semakin kecil semakin baik" dihitung
      // terbalik agar >100% tetap berarti melampaui target.
      const percent = lowerIsBetter
        ? value > 0
          ? Math.round((target / value) * 100)
          : null
        : target > 0
          ? Math.round((value / target) * 100)
          : null;
      const percentText = percent === null ? "" : ` (${percent}% dari target)`;
      return {
        status: reached ? "reached" : "missed",
        label: reached ? "Tercapai" : "Tidak Tercapai",
        detail: `Capaian ${fmtNum(value)}${percentText} · Target ${fmtNum(target)}`,
      };
    };

    const interpretasiNode = (row: any) => {
      const it = interpretCapaian(row);
      if (it.status === "empty") {
        return h("span", { style: { color: "#999" } }, "—");
      }
      if (it.status === "no-target") {
        return h(
          "span",
          { style: { color: "#999", fontSize: "12px" }, title: it.detail },
          "Tanpa target",
        );
      }
      return h(
        "span",
        { title: it.detail },
        h(
          NTag,
          {
            size: "small",
            bordered: false,
            type: it.status === "reached" ? "success" : "error",
          },
          { default: () => it.label },
        ),
      );
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
      { title: "Grup", key: "groupName", width: 180, render: (row: any) => groupNamesOf(row).join(", ") || "—" },
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
            disabled:
              !canCrud ||
              row.isVerified ||
              savingItemId.value === row.indicatorId,
            "onUpdate:value": (val: number | null) => {
              row.inputValue = val;
              saveSingleItem(row);
            },
          });
        },
      },
      {
        title: "Interpretasi",
        key: "interpretasi",
        width: 160,
        render(row: any) {
          return interpretasiNode(row);
        },
      },
      {
        title: "Catatan",
        key: "inputNote",
        render(row: any) {
          return h(NInput, {
            value: row.inputNote,
            placeholder: "Opsional",
            disabled: !canCrud || row.isVerified,
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
      {
        title: "Verifikasi",
        key: "isVerified",
        width: 100,
        render(row: any) {
          if (!row.achievementId) {
            return h("span", { style: { color: "#999" } }, "—");
          }
          return h(NCheckbox, {
            checked: !!row.isVerified,
            disabled: !isVerifikator,
            "onUpdate:checked": () => toggleVerification(row),
          });
        },
      },
      {
        title: "Lampiran",
        key: "attachment",
        width: 250,
        render(row: any) {
          return renderAttachmentCell(row, "attachment");
        },
      },
      {
        title: "File Evaluasi",
        key: "evaluation",
        width: 250,
        render(row: any) {
          return renderAttachmentCell(row, "evaluation");
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
      return (historyData.value as any[]).filter((x: any) =>
        groupIdsOf(x).includes(filterGroupIdHistory.value as number),
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
      if (!canCrud) return;
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
      if (row.isVerified) {
        message.warning(
          "Data sudah diverifikasi — hapus verifikasi terlebih dahulu untuk mengubah.",
        );
        return;
      }
      editForm.value = { id: row.id, value: row.value, note: row.note ?? "" };
      isEditModalOpen.value = true;
    };

    const submitEdit = async () => {
      if (!canCrud) {
        message.warning("Anda tidak memiliki akses untuk mengubah capaian");
        return;
      }
      const srcRow: any = historyData.value.find(
        (x: any) => x.id === editForm.value.id,
      );
      if (srcRow?.isVerified) {
        message.warning(
          "Data sudah diverifikasi — hapus verifikasi terlebih dahulu untuk mengubah.",
        );
        return;
      }
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
          if (!canCrud) return "—";
          return h("div", { style: { display: "flex", gap: "6px" } }, [
            h(
              NButton,
              {
                size: "small",
                type: "primary",
                disabled: row.isVerified,
                title: row.isVerified
                  ? "Tidak dapat mengubah data yang sudah diverifikasi"
                  : "Ubah nilai capaian",
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
      { title: "Grup", key: "groupName", width: 180, render: (row: any) => groupNamesOf(row).join(", ") || "—" },
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
        title: "Lampiran",
        key: "attachment",
        width: 260,
        render(row: any) {
          return renderAttachmentCell(row, "attachment");
        },
      },
      {
        title: "File Evaluasi",
        key: "evaluation",
        width: 260,
        render(row: any) {
          return renderAttachmentCell(row, "evaluation");
        },
      },
      {
        title: "Verifikasi",
        key: "isVerified",
        width: 100,
        render(row: any) {
          return h(NCheckbox, {
            checked: !!row.isVerified,
            disabled: !isVerifikator,
            "onUpdate:checked": () => toggleVerification(row),
          });
        },
      },
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
    fetchOrganizationIdOptions();
    fetchPeriodData();
    fetchHistory(1);

    return {
      activeTab,
      // group indicator options
      groupIndicatorOptions,
      // organization (unit kerja) options
      organizationIdOptions,
      // period input
      selectedYear,
      selectedMonth,
      filterOrgIdInput,
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
