import { Config } from "@/constant/config";
import { getAuthData, saveAuthData, logout } from "@/services/authService";
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import {
  useMessage,
  useDialog,
  useNotification,
  useLoadingBar,
  MenuOption,
} from "naive-ui";
import { LAYOUT_ITEMS } from "@/constant/constant";
import { useRouter, useRoute } from "vue-router";
import useConfig from "@/hooks/useConfig";
import ProfileBar from "@/components/ProfileBar.vue";
import Login from "@/components/Login.vue";

// =====================
// Types
// =====================
type MenuItem = MenuOption & {
  children?: MenuItem[];
};

// =====================
// Auth State Machine
// =====================
enum AuthState {
  INIT = "INIT",
  CHECKING = "CHECKING",
  AUTH = "AUTH",
  UNAUTH = "UNAUTH",
  LOGOUT = "LOGOUT",
  ERROR = "ERROR",
}

// =====================
// Utils
// =====================
function removeNodeByKey(items: MenuItem[], keyToRemove: string): MenuItem[] {
  return items
    .filter((item) => item.key !== keyToRemove)
    .map((item) => ({
      ...item,
      children: item.children
        ? removeNodeByKey(item.children as MenuItem[], keyToRemove)
        : undefined,
    }));
}

// Kumpulkan semua key yang merupakan leaf (punya route nyata)
function collectLeafKeys(items: MenuItem[]): Set<string> {
  const keys = new Set<string>();
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.children && item.children.length > 0) {
        walk(item.children as MenuItem[]);
      } else if (item.key) {
        keys.add(item.key as string);
      }
    }
  };
  walk(items);
  return keys;
}

export default defineComponent({
  name: "App",
  components: {
    ProfileBar,
    Login,
  },

  setup() {
    const router = useRouter();
    const route = useRoute();

    // =====================
    // UI State
    // =====================
    const collapsed = ref(false);
    const isMobile = ref(window.innerWidth < 768);
    const activeName = ref("/dashboard");
    const layoutOptions = ref<MenuOption[]>([]);

    // =====================
    // Auth State Machine
    // =====================
    const authState = ref<AuthState>(AuthState.INIT);

    const isLoggedIn = computed(() => authState.value === AuthState.AUTH);
    const isAuthChecked = computed(
      () => ![AuthState.INIT, AuthState.CHECKING].includes(authState.value),
    );

    // =====================
    // UI Utilities
    // =====================
    window.$message = useMessage();
    window.$dialog = useDialog();
    window.$notification = useNotification();
    window.$loadingBar = useLoadingBar();

    // =====================
    // Config
    // =====================
    const { theme, lang, changeTheme, changeLang } = useConfig();
    const showLang = computed(() =>
      lang.value.name === "id-ID" ? "Bahasa" : "English",
    );

    // =====================
    // Auth Actions
    // =====================
    const checkAuth = async () => {
      authState.value = AuthState.CHECKING;
      try {
        const auth = getAuthData();
        if (auth?.token) {
          authState.value = AuthState.AUTH;
        } else {
          authState.value = AuthState.UNAUTH;
        }
      } catch (e) {
        console.error("Auth check error", e);
        authState.value = AuthState.ERROR;
      }
    };

    const onLoginSuccess = async () => {
      await checkAuth(); // ⬅ masuk ulang ke state machine
    };

    const doLogout = async () => {
      authState.value = AuthState.LOGOUT;
      logout();
      authState.value = AuthState.UNAUTH;
    };

    // =====================
    // Menu Builder
    // =====================
    const buildMenu = () => {
      const auth = getAuthData();
      if (!auth?.token) return [];

      let menu: MenuItem[] = JSON.parse(JSON.stringify(LAYOUT_ITEMS));

      return menu;
    };

    // =====================
    // Watch Auth State
    // =====================
    watch(authState, (state) => {
      if (state === AuthState.AUTH) {
        layoutOptions.value = buildMenu();
      }

      if (state === AuthState.UNAUTH) {
        layoutOptions.value = [];
      }

      if (state === AuthState.ERROR) {
        layoutOptions.value = [];
      }
    });

    // =====================
    // Handlers
    // =====================
    const handleMenuSelect = (value: string) => {
      activeName.value = value;
      // Tutup sidebar otomatis di mobile setelah menu dipilih
      if (isMobile.value) {
        collapsed.value = true;
      }
      // Hanya push jika key adalah leaf (bukan parent menu tanpa route)
      const leafKeys = collectLeafKeys(layoutOptions.value as MenuItem[]);
      if (leafKeys.has(value)) {
        router.push({ path: value }).catch(() => {
          /* route tidak ditemukan */
        });
      }
    };

    const handleLogout = async () => {
      await doLogout();
    };

    // =====================
    // Lifecycle
    // =====================
    let resizeHandler: () => void;

    onMounted(async () => {
      await checkAuth();

      // Sync activeName dengan route yang sedang aktif
      activeName.value = route.path;

      // Responsive sidebar
      resizeHandler = () => {
        const mobile = window.innerWidth < 768;
        isMobile.value = mobile;
        // Tutup sidebar otomatis saat layar mengecil ke mobile
        if (mobile) collapsed.value = true;
      };
      resizeHandler();
      window.addEventListener("resize", resizeHandler);
    });

    onUnmounted(() => {
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    });

    // Sync activeName setiap kali route berubah (misal back/forward browser)
    watch(
      () => route.path,
      (path) => {
        activeName.value = path;
      },
    );

    return {
      // ui
      layoutOptions,
      collapsed,
      isMobile,
      activeName,

      // auth
      authState,
      isLoggedIn,
      isAuthChecked,
      onLoginSuccess,

      // config
      theme,
      lang,
      showLang,
      changeTheme,
      changeLang,

      // handlers
      handleMenuSelect,
      handleLogout,

      // enum
      AuthState,
    };
  },
});
