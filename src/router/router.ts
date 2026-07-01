import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "@/container/dashboard/Dashboard.vue";
import GroupIndicator from "@/container/admin/GroupIndicator.vue";
import Indicator from "@/container/admin/Indicator.vue";
import IndicatorAchievement from "@/container/admin/IndicatorAchievement.vue";
import KpiSetting from "@/container/admin/KpiSetting.vue";
import PropDashboard from "@/container/admin/PropDashboard.vue";
import BarDashboard from "@/container/admin/BarDashboard.vue";

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
  ],
});

export default router;
