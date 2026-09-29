<template>
    <div>
        <h3>Indicator</h3>
        <n-space vertical>
            <n-space horizontal>
                <n-button type="primary" @click="openAddModal" class="mb-4">
                    Add Data
                </n-button>
                <n-select
                    v-model:value="filterOrganizationId"
                    :options="organizationIdOptions"
                    placeholder="Filter Unit Kerja"
                    clearable
                    style="width: 220px"
                    @update:value="handleFilterOrganization"
                />
                <n-select
                    v-model:value="filterGroupId"
                    :options="groupIdOptions"
                    :consistent-menu-width="false"
                    placeholder="Filter Grup Indikator"
                    clearable
                    style="width: 320px"
                    @update:value="handleFilterGroup"
                />
                <n-input-group>
                    <n-button type="primary"> Search </n-button>
                    <n-input
                        :style="{ width: '50%' }"
                        v-model:value="inputSearch"
                        @keydown.enter="handleInputSearch"
                    />
                    <n-button type="primary" ghost> Search </n-button>
                </n-input-group>
            </n-space>
            <n-data-table
                :columns="columns"
                :data="filteredTableData"
                :max-height="300"
                :scroll-x="1250"
            />
            <n-pagination
                v-model:page="current"
                :page-count="Math.ceil(total / pageSize)"
                @update:page="handlePageChange"
            />
        </n-space>
    </div>
    <n-modal
        v-model:show="isModalOpen"
        :title="isEditMode ? 'Edit Data' : 'Add Data'"
        preset="dialog"
        :style="{ width: '600px' }"
    >
        <n-form :model="formData" label-width="100">
            <n-form-item label="Id">
                <n-input
                    v-model:value="formData.id"
                    placeholder="By system"
                    :disabled="true"
                />
            </n-form-item>
            <n-form-item label="Name">
                <n-input v-model:value="formData.name" />
            </n-form-item>
            <n-form-item label="Group (bisa lebih dari satu)">
                <n-select
                    v-model:value="formData.groupIds"
                    :options="groupIdOptions"
                    multiple
                    max-tag-count="responsive"
                    placeholder="Pilih satu atau lebih grup"
                />
            </n-form-item>
            <n-form-item label="Unit Kerja">
                <n-select
                    v-model:value="formData.organizationId"
                    :options="organizationIdOptions"
                    placeholder="Pilih unit kerja"
                    clearable
                    @update:value="handleOrganizationChange"
                />
            </n-form-item>
            <n-form-item label="PIC">
                <n-select
                    v-model:value="formData.picId"
                    :options="picOptions"
                    :disabled="!formData.organizationId"
                    placeholder="Pilih PIC (pegawai unit kerja)"
                    filterable
                    clearable
                />
            </n-form-item>
            <n-form-item label="Kriteria">
                <n-select
                    v-model:value="formData.criteria"
                    :options="criteriaOptions"
                    placeholder="Pilih kriteria"
                />
                <n-text
                    depth="3"
                    style="font-size: 12px; margin-top: 4px; display: block"
                >
                    <b>Bulan Terakhir</b>: nilai diambil dari bulan yang dipilih
                    saja.<br />
                    <b>Akumulasi</b>: nilai dijumlahkan dari bulan pertama s/d
                    bulan yang dipilih.<br />
                    <b>Rata-rata</b>: nilai dijumlahkan dari bulan pertama s/d
                    bulan yang dipilih, lalu dirata-rata (dibagi jumlah bulan
                    yang ada datanya).
                </n-text>
            </n-form-item>
            <n-form-item label="Status Active">
                <n-switch v-model:value="formData.isActive" />
            </n-form-item>
        </n-form>
        <n-space horizontal>
            <n-button @click="closeModal">Cancel</n-button>
            <n-button type="primary" @click="submitForm">
                {{ isEditMode ? "Simpan Perubahan" : "Tambah" }}
            </n-button>
        </n-space>
    </n-modal>
</template>
<script src="./Indicator.ts" />
