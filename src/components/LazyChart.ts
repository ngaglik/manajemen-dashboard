import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import VChart from "vue-echarts";

// Pembungkus v-chart yang menunda pembuatan instance ECharts sampai elemennya
// masuk viewport. Dashboard bisa memuat puluhan kartu grafik sekaligus; tanpa
// penundaan ini semua instance diinisialisasi pada frame yang sama sehingga
// halaman terasa lama tampil.
export default defineComponent({
  name: "LazyChart",
  components: { VChart },
  // class/style dari parent diteruskan manual ke elemen host (lihat template)
  // agar tinggi grafik dari CSS pemanggil tetap berlaku.
  inheritAttrs: false,
  props: {
    option: {
      type: Object as () => any,
      default: null,
    },
    // Seberapa awal grafik disiapkan sebelum benar-benar terlihat.
    rootMargin: {
      type: String,
      default: "200px 0px",
    },
  },
  setup(props) {
    const hostEl = ref<HTMLElement | null>(null);
    const ready = ref(false);
    let observer: IntersectionObserver | null = null;

    const stopObserving = () => {
      observer?.disconnect();
      observer = null;
    };

    onMounted(() => {
      // Tanpa IntersectionObserver (browser lama / SSR) langsung render.
      if (typeof IntersectionObserver === "undefined" || !hostEl.value) {
        ready.value = true;
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          // Sekali grafik tampil, instance-nya dipertahankan supaya tidak
          // dibuat ulang saat pengguna menggulir bolak-balik.
          ready.value = true;
          stopObserving();
        },
        { rootMargin: props.rootMargin },
      );
      observer.observe(hostEl.value);
    });

    onBeforeUnmount(stopObserving);

    return { hostEl, ready };
  },
});
