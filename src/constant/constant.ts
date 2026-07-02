export const LAYOUT_ITEMS = [
  {
    label: "Dashboard",
    key: "/dashboard",
  },
  {
    label: "Capaian Indikator",
    key: "/indicator-achievement",
  },
  {
    label: "Pengaturan",
    key: "/master-data",
    children: [
      {
        label: "Group Indicator",
        key: "/group-indicator",
      },
      {
        label: "Indicator",
        key: "/indicator",
      },
      {
        label: "Pengaturan KPI",
        key: "/kpi-setting",
      },
      {
        label: "Dashboard Proporsional",
        key: "/prop-dashboard",
      },
      {
        label: "Dashboard Bar",
        key: "/bar-dashboard",
      },
    ],
  },
];
