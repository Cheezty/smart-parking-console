<script setup lang="ts">
import { computed, ref } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'
import { formatDuration, formatMoney, formatTime, durationInMinutes } from '../domain/parking'
import { useParkingStore } from '../stores/parking'

const store = useParkingStore()
const query = ref('')
const status = ref('all')
const page = ref(1)
const pageSize = 10
const now = ref(new Date().toISOString())
const filtered = computed(() => store.activeSessions.filter(s => s.plateNo.includes(query.value.trim().toUpperCase()) && (status.value === 'all' || s.status === status.value)))
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
function refresh() { now.value = new Date().toISOString() }
</script>

<template>
  <div class="page-head"><div><span class="eyebrow">ON-SITE VEHICLES</span><h1>在场车辆</h1><p>查看在场与待离场车辆，状态与值守台实时一致。</p></div><span class="head-status">共 {{ store.activeSessions.length }} 辆</span></div>
  <section class="surface-card table-card"><div class="table-toolbar"><div><el-input v-model="query" clearable placeholder="搜索车牌号码" @input="page = 1" /><el-select v-model="status" @change="page = 1"><el-option label="全部状态" value="all" /><el-option label="在场" value="parked" /><el-option label="待支付" value="pending_payment" /><el-option label="可通行" value="ready_to_leave" /></el-select></div><el-button @click="refresh"><el-icon><RefreshRight /></el-icon> 刷新</el-button></div><el-table :data="rows" stripe empty-text="暂无符合条件的车辆"><el-table-column label="车牌号码" min-width="140" sortable prop="plateNo"><template #default="scope"><strong class="plate-text">{{ scope.row.plateNo }}</strong></template></el-table-column><el-table-column label="入场时间" min-width="190" sortable prop="entryAt"><template #default="scope">{{ formatTime(scope.row.entryAt) }}</template></el-table-column><el-table-column label="入场编号" prop="entryLaneId" min-width="115" /><el-table-column label="停车时长" min-width="130"><template #default="scope">{{ formatDuration(scope.row.durationMinutes ?? durationInMinutes(scope.row.entryAt, now)) }}</template></el-table-column><el-table-column label="应付金额" min-width="110"><template #default="scope">{{ formatMoney(scope.row.amountFen) }}</template></el-table-column><el-table-column label="状态" min-width="110"><template #default="scope"><span class="status-tag" :class="scope.row.status === 'parked' ? 'info' : scope.row.status === 'pending_payment' ? 'warning' : 'success'">{{ scope.row.status === 'parked' ? '在场' : scope.row.status === 'pending_payment' ? '待支付' : '可通行' }}</span></template></el-table-column></el-table><div class="table-pagination"><span>共 {{ filtered.length }} 条</span><el-pagination v-model:current-page="page" :page-size="pageSize" layout="prev, pager, next" :total="filtered.length" /></div></section>
</template>
