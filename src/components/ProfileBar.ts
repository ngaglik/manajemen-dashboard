import { defineComponent } from "vue";
import { useMessage } from "naive-ui";
import { logout } from "@/services/authService";
import type { DropdownOption } from "naive-ui";

export default defineComponent({
  name: "ProfileBar",
  emits: ["logout"],
  setup(_, { emit }) {
    const message = useMessage();

    const options: DropdownOption[] = [
      {
        label: "Logout",
        key: "logout",
      },
    ];

    const handleSelect = (key: string) => {
      if (key === "logout") {
        emit("logout");
      }
    };

    return {
      options,
      handleSelect,
    };
  },
});
