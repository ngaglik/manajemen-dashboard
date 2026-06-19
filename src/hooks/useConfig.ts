import { computed, ref } from "vue";
import { useOsTheme } from "naive-ui";

export default function useConfig() {
  const osTheme = useOsTheme();

  const getTheme = () => {
    try {
      return localStorage.getItem("config:theme") as "light" | "dark" | null;
    } catch {
      return osTheme.value;
    }
  };

  const getLang = () => {
    try {
      const stored = localStorage.getItem("config:lang");
      return stored
        ? JSON.parse(stored)
        : { name: "id-ID", label: "Bahasa Indonesia" };
    } catch {
      return { name: "id-ID", label: "Bahasa Indonesia" };
    }
  };

  const theme = ref(getTheme());
  const lang = ref(getLang());

  const changeTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
    try {
      localStorage.setItem("config:theme", theme.value);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  };

  const changeLang = (name: string) => {
    lang.value = name;
    try {
      localStorage.setItem("config:lang", JSON.stringify(name));
    } catch (e) {
      console.error("Failed to save language", e);
    }
  };

  return {
    theme: computed(() => theme.value),
    lang: computed(() => lang.value),
    changeTheme,
    changeLang,
  };
}
