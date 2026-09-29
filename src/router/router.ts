import { createRouter, createWebHistory } from "vue-router";
import { getAuthData } from "@/services/authService";
import Dashboard from "@/container/dashboard/Dashboard.vue";
import GroupIndicator from "@/container/admin/GroupIndicator.vue";
import Indicator from "@/container/admin/Indicator.vue";
import IndicatorAchievement from "@/container/admin/IndicatorAchievement.vue";
import KpiSetting from "@/container/admin/KpiSetting.vue";
import PropDashboard from "@/container/admin/PropDashboard.vue";
import BarDashboard from "@/container/admin/BarDashboard.vue";
import BankSop from "@/container/admin/BankSop.vue";
import DewasRecommendation from "@/container/admin/DewasRecommendation.vue";
import RapatNotulen from "@/container/admin/RapatNotulen.vue";
import BankRegulasi from "@/container/admin/BankRegulasi.vue";
import BankPedoman from "@/container/admin/BankPedoman.vue";
import BankPanduan from "@/container/admin/BankPanduan.vue";

// Rute di bawah menu Pengaturan — hanya untuk user bertag VERIFIKATORDASHBOARD
const ADMIN_PATHS = [
  "/group-indicator",
  "/indicator",
  "/kpi-setting",
  "/prop-dashboard",
  "/bar-dashboard",
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: Dashboard,
    },
    {
      path: "/dashboard",
      component: Dashboard,
    },
    {
      path: "/group-indicator",
      component: GroupIndicator,
    },
    {
      path: "/indicator",
      component: Indicator,
    },
    {
      path: "/indicator-achievement",
      component: IndicatorAchievement,
    },
    {
      path: "/kpi-setting",
      component: KpiSetting,
    },
    {
      path: "/prop-dashboard",
      component: PropDashboard,
    },
    {
      path: "/bar-dashboard",
      component: BarDashboard,
    },
    {
      path: "/bank-sop",
      component: BankSop,
    },
    {
      path: "/dewas-recommendation",
      component: DewasRecommendation,
    },
    {
      path: "/rapat-notulen",
      component: RapatNotulen,
    },
    {
      path: "/bank-regulasi",
      component: BankRegulasi,
    },
    {
      path: "/bank-pedoman",
      component: BankPedoman,
    },
    {
      path: "/bank-panduan",
      component: BankPanduan,
    },
  ],
});

// Guard: blokir akses langsung ke halaman terproteksi
router.beforeEach((to) => {
  const auth = getAuthData();
  const tags = String(auth?.employee?.tags ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase());
  const isVerifikator = tags.includes("VERIFIKATORDASHBOARD");
  const isAdmin = tags.includes("ADMINDASHBOARD");

  // Halaman Pengaturan — hanya untuk verifikator
  if (ADMIN_PATHS.includes(to.path) && !isVerifikator) {
    return { path: "/dashboard" };
  }

  // Capaian Indikator — hanya VERIFIKATORDASHBOARD / ADMINDASHBOARD
  if (to.path === "/indicator-achievement" && !isVerifikator && !isAdmin) {
    return { path: "/dashboard" };
  }

  return true;
});

export default router;
