<template>
    <!-- LOADING STATE -->
    <div v-if="!isAuthChecked" class="auth-loading">
        <n-spin size="large" />
    </div>

    <!-- UNAUTH STATE -->
    <Login
        v-else-if="authState === AuthState.UNAUTH"
        @login-success="onLoginSuccess"
    />

    <!-- AUTH STATE -->
    <template v-else-if="authState === AuthState.AUTH">
        <!-- ── HEADER ──────────────────────────────────────────────── -->
        <header class="app-header">
            <div class="header-left">
                <!-- Burger Button -->
                <button
                    class="burger-btn"
                    :class="{ 'is-open': !collapsed }"
                    @click="collapsed = !collapsed"
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <span class="app-title">Manajemen Dashboard</span>
            </div>

            <div class="header-right">
                <n-button text size="small" @click="changeTheme">
                    {{ theme === null ? "Dark" : "Light" }}
                </n-button>
                <ProfileBar @logout="handleLogout" />
            </div>
        </header>

        <!-- ── BODY (sidebar + content) ───────────────────────────── -->
        <div class="app-body">
            <!-- Mobile Overlay -->
            <transition name="overlay-fade">
                <div
                    v-if="!collapsed && isMobile"
                    class="sidebar-overlay"
                    @click="collapsed = true"
                />
            </transition>

            <!-- Sidebar -->
            <aside class="app-sidebar" :class="{ collapsed }">
                <div class="sidebar-menu-label">Menu</div>
                <n-menu
                    :value="activeName"
                    :options="layoutOptions"
                    :collapsed="false"
                    :collapsed-icon-size="20"
                    @update:value="handleMenuSelect"
                />
            </aside>

            <!-- Main Content -->
            <main class="app-content" :class="{ 'sidebar-open': !collapsed }">
                <router-view v-slot="{ Component }">
                    <component :is="Component" :key="$route.path" />
                </router-view>
            </main>
        </div>
    </template>
</template>

<script src="./App.ts" />

<style scoped>
/* ── Auth Loading ──────────────────────────────────────────── */
.auth-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
}

/* ── Header ────────────────────────────────────────────────── */
.app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: var(--n-color, #fff);
    border-bottom: 1px solid var(--n-border-color, #e8e8e8);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.app-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--n-text-color, #333);
    user-select: none;
}

/* ── Burger Button ─────────────────────────────────────────── */
.burger-btn {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 36px;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: var(--n-text-color, #333);
    transition: background 0.2s;
    flex-shrink: 0;
}

.burger-btn:hover {
    background: var(--n-hover-color, rgba(0, 0, 0, 0.06));
}

.burger-btn span {
    display: block;
    width: 20px;
    height: 2px;
    background: currentColor;
    border-radius: 2px;
    transition:
        transform 0.28s ease,
        opacity 0.28s ease,
        width 0.28s ease;
    transform-origin: center;
}

/* Animasi ☰ → ✕ */
.burger-btn.is-open span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
}
.burger-btn.is-open span:nth-child(2) {
    opacity: 0;
    width: 0;
}
.burger-btn.is-open span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
}

/* ── Body ──────────────────────────────────────────────────── */
.app-body {
    display: flex;
    padding-top: 52px; /* tinggi header */
    min-height: 100vh;
    position: relative;
}

/* ── Sidebar ───────────────────────────────────────────────── */
.app-sidebar {
    position: fixed;
    top: 52px;
    left: 0;
    bottom: 0;
    width: 240px;
    z-index: 150;
    background: var(--n-color, #fff);
    border-right: 1px solid var(--n-border-color, #e8e8e8);
    overflow-y: auto;
    overflow-x: hidden;
    transform: translateX(0);
    transition:
        transform 0.28s ease,
        width 0.28s ease;
}

.app-sidebar.collapsed {
    transform: translateX(-100%);
}

.sidebar-menu-label {
    padding: 14px 20px 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--n-text-color-3, #aaa);
    user-select: none;
}

/* ── Main Content ──────────────────────────────────────────── */
.app-content {
    flex: 1;
    width: 100%;
    min-height: calc(100vh - 52px);
    padding: 16px;
    transition: margin-left 0.28s ease;
    box-sizing: border-box;
}

/* Desktop: dorong konten ketika sidebar terbuka */
@media (min-width: 769px) {
    .app-content.sidebar-open {
        margin-left: 240px;
    }
}

/* ── Mobile Overlay ────────────────────────────────────────── */
.sidebar-overlay {
    position: fixed;
    inset: 52px 0 0 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 140;
    cursor: pointer;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: opacity 0.25s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}

/* ── Mobile ────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .app-content {
        padding: 10px;
    }
}
</style>
