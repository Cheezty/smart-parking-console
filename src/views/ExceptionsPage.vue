<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatTime, type ParkingException } from '../domain/parking'
import { useParkingStore } from '../stores/parking'

const store = useParkingStore()
const filter = ref('open')
const dialog = ref(false)
const selected = ref<ParkingException | null>(null)
const reason = ref('')
const rows = computed(() => store.exceptions.filter(e => filter.value === 'all' || e.status === filter.value))
function openResolve(item: ParkingException) { selected.value = item; reason.value = ''; dialog.value = true }
function resolve() {
  if (!selected.value || reason.value.trim().length < 4) { ElMessage.warning('请填写至少 4 个字的处理原因'); return }
  store.resolveException(selected.value.exceptionId, reason.value.trim())
  dialog.value = false
  ElMessage.success('异常已标记为已核查')
}
</script>

<template>
  <div class="page-head"><div><span class="eyebrow">EXCEPTION CENTER</span><h1>异常处理</h1><p>重复入场和未匹配入场会自动进入此列表，人工核查后留下原因。</p></div><span class="head-status alert">{{ store.openExceptions.length }} 项待核查</span></div>
  <section class="surface-card table-card"><div class="table-toolbar"><div><el-select v-model="filter"><el-option label="待核查" value="open" /><el-option label="全部状态" value="all" /><el-option label="已核查" value="resolved" /></el-select></div></div><el-table :data="rows" stripe empty-text="暂无异常事件"><el-table-column label="异常编号" prop="exceptionId" min-width="145" /><el-table-column label="异常类型" min-width="140"><template #default="scope"><span class="status-tag warning">{{ scope.row.type === 'duplicate_entry' ? '重复入场' : '未找到入场记录' }}</span></template></el-table-column><el-table-column label="车牌号码" prop="plateNo" min-width="130"><template #default="scope"><strong class="plate-text">{{ scope.row.plateNo }}</strong></template></el-table-column><el-table-column label="车道" prop="laneId" min-width="100" /><el-table-column label="发生时间" min-width="190"><template #default="scope">{{ formatTime(scope.row.occurredAt) }}</template></el-table-column><el-table-column label="状态" min-width="110"><template #default="scope">{{ scope.row.status === 'open' ? '待核查' : '已核查' }}</template></el-table-column><el-table-column label="操作" min-width="120"><template #default="scope"><el-button v-if="scope.row.status === 'open'" link type="primary" @click="openResolve(scope.row)">标记已核查</el-button><span v-else class="subtle" :title="scope.row.resolutionReason">{{ scope.row.resolutionReason || '—' }}</span></template></el-table-column></el-table></section>
  <el-dialog v-model="dialog" title="核查异常事件" width="480px"><p>请核查原始事件后记录处理原因。此操作不会自动补建入场会话或放行车辆。</p><el-input v-model="reason" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="填写核查结果与处理原因" /><template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" @click="resolve">确认标记</el-button></template></el-dialog>
</template>
