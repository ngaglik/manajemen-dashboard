<template>
    <div ref="hostEl" class="lazy-chart" v-bind="$attrs">
        <v-chart
            v-if="ready"
            class="lazy-chart-canvas"
            :option="option"
            :autoresize="true"
        />
        <div v-else class="lazy-chart-skeleton" aria-hidden="true"></div>
    </div>
</template>

<script src="./LazyChart.ts" />

<style scoped>
.lazy-chart {
    position: relative;
    width: 100%;
}

.lazy-chart-canvas {
    width: 100%;
    height: 100%;
}

.lazy-chart-skeleton {
    width: 100%;
    height: 100%;
    min-height: 80px;
    border-radius: 8px;
    background: rgba(128, 128, 128, 0.08);
}
</style>
