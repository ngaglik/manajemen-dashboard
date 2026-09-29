<template>
    <n-marquee>
        <n-h1 prefix="bar">
            <n-text type="primary">DashMan</n-text>
        </n-h1>
        Dashboard Management System
    </n-marquee>

    <div class="login-wrapper">
        <n-card style="max-width: 400px; margin: 0 auto">
            <div class="login-logo">
                <img :src="logoRspaw" alt="Logo RSPAW" />
            </div>
            <small>Silakan login menggunakan akun SiJEMPOL</small>
            <n-divider />

            <n-form
                :model="form"
                :rules="rules"
                ref="formRef"
                label-placement="top"
                @keyup.enter="submit"
            >
                <n-form-item label="Username" path="username">
                    <n-input
                        v-model:value="form.username"
                        placeholder="Masukkan username"
                        :disabled="loading"
                    />
                </n-form-item>

                <n-form-item label="Password" path="password">
                    <n-input
                        v-model:value="form.password"
                        type="password"
                        show-password-on="click"
                        placeholder="Masukkan password"
                        :disabled="loading"
                    />
                </n-form-item>

                <n-space justify="end">
                    <n-button
                        type="primary"
                        :loading="loading"
                        :disabled="loading"
                        @click="submit"
                    >
                        Login
                    </n-button>
                </n-space>
            </n-form>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { FormInst, useMessage } from "naive-ui";
import { Config } from "@/constant/config";
import logoRspaw from "../../assets/logo-rspaw.png";

// =====================
// Emits
// =====================
const emit = defineEmits<{
    (e: "login-success"): void;
}>();

// =====================
// State
// =====================
const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const message = useMessage();

const form = ref({
    username: "",
    password: "",
});

// =====================
// Validation Rules
// =====================
const rules = {
    username: [
        { required: true, message: "Username wajib diisi", trigger: "blur" },
    ],
    password: [
        { required: true, message: "Password wajib diisi", trigger: "blur" },
    ],
};

// =====================
// Submit Handler
// =====================
const submit = async () => {
    if (loading.value) return;

    await formRef.value?.validate(async (errors) => {
        if (errors) return;

        loading.value = true;

        try {
            const response = await fetch(
                `${Config.UrlBackend}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        appid: Config.AppId,
                        username: form.value.username,
                        password: form.value.password,
                    }),
                },
            );

            if (!response.ok) {
                message.error("Username atau password salah");
                return;
            }

            const data = await response.json();

            // =====================
            // WAJIB: simpan token dulu
            // =====================
            localStorage.setItem(Config.TokenName, JSON.stringify(data));

            message.success("Login berhasil!");

            // =====================
            // Emit AFTER token saved
            // =====================
            emit("login-success");
        } catch (error) {
            console.error("Login error:", error);
            message.error("Terjadi kesalahan saat login");
        } finally {
            loading.value = false;
        }
    });
};
</script>

<style scoped>
.login-wrapper {
    height: 70vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.login-logo {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
}

.login-logo img {
    height: 72px;
    width: auto;
    object-fit: contain;
}
</style>
