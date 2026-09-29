<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Wallet } from '@element-plus/icons-vue'
import { formatDuration, formatMoney, formatTime } from '../domain/parking'
import { useParkingStore } from '../stores/parking'
import JsonPanel from '../components/JsonPanel.vue'

const store = useParkingStore()
const search = ref('')
const selectedId = ref<string | null>(null)
const busy = ref(false)
const candidates = computed(() => store.sessions.filter(s => s.exitAt && s.status !== 'left' && s.plateNo.includes(search.value.trim().toUpperCase())))
const selected = computed(() => store.sessions.find(s => s.sessionId === selectedId.value) ?? candidates.value[0] ?? null)
watch(candidates, list => { if (selectedId.value && !list.some(s => s.sessionId === selectedId.value)) selectedId.value = null })

async function pay() {
  if (!selected.value || busy.value) return
  await ElMessageBox.confirm(`确认已收到 ${formatMoney(selected.value.amountFen)}？此按钮仅模拟人工核实，不会发起真实支付。`, '演示确认收款', { confirmButtonText: '确认已收款', cancelButtonText: '取消', type: 'warning' })
  busy.value = true
  try {
    const updated = store.confirmPayment(selected.value.sessionId)
    if (updated) ElMessage.success('支付状态已更新为已支付')
    else ElMessage.error('当前记录不能确认支付')
  } finally { busy.value = false }
}

async function pass() {
  if (!selected.value || busy.value) return
  await ElMessageBox.confirm('确认车辆已经通过出口？此操作仅记录演示通行状态。', '确认车辆通过', { confirmButtonText: '确认通过', cancelButtonText: '取消' })
  busy.value = true
  try {
    const updated = store.confirmPassage(selected.value.sessionId)
    if (updated) ElMessage.success('已记录车辆离场')
    else ElMessage.error('请先完成支付确认')
  } finally { busy.value = false }
}
</script>

<template>
  <div class="page-head"><div><span class="eyebrow">PAYMENT WORKSPACE</span><h1>收费工作台</h1><p>核对停车费用，分别确认支付与车辆通行。</p></div><span class="head-status"><span class="pulse-dot"></span>{{ store.pendingSessions.length }} 辆待处理</span></div>
  <div class="notice-strip"><el-icon><Wallet /></el-icon><span>支付确认是本地演示操作，不会收款或控制道闸。真实系统须以后端支付核验和设备回执为准。</span></div>
  <div class="cashier-grid">
    <section class="surface-card queue-card"><div class="section-heading"><div><span class="eyebrow">EXIT QUEUE</span><h2>出口处理队列</h2></div><span class="subtle">{{ candidates.length }} 条记录</span></div><el-input v-model="search" clearable placeholder="按车牌搜索" class="queue-search" /><div v-if="candidates.length" class="queue-list"><button v-for="item in candidates" :key="item.sessionId" type="button" class="queue-item" :class="{ selected: selected?.sessionId === item.sessionId }" @click="selectedId = item.sessionId"><div><strong class="plate-text">{{ item.plateNo }}</strong><span class="status-tag" :class="item.status === 'pending_payment' ? 'warning' : 'success'">{{ item.status === 'pending_payment' ? '待支付' : '可通行' }}</span></div><small>{{ item.exitLaneId }} · {{ formatTime(item.exitAt) }}</small><b>{{ formatMoney(item.amountFen) }}</b></button></div><el-empty v-else description="暂无待处理出口车辆" /></section>
    <section class="surface-card payment-card"><template v-if="selected"><div class="section-heading"><div><span class="eyebrow">PARKING SESSION</span><h2>停车费用与状态</h2></div><span class="subtle">{{ selected.sessionId }}</span></div><div class="payment-hero"><div><span>当前车辆</span><strong>{{ selected.plateNo }}</strong></div><div><span>应付金额</span><strong class="payment-amount">{{ formatMoney(selected.amountFen) }}</strong></div></div><div class="payment-detail-grid"><div><span>入场时间</span><strong>{{ formatTime(selected.entryAt) }}</strong></div><div><span>出场时间</span><strong>{{ formatTime(selected.exitAt) }}</strong></div><div><span>入口编号</span><strong>{{ selected.entryLaneId }}</strong></div><div><span>出口编号</span><strong>{{ selected.exitLaneId }}</strong></div><div><span>停车时长</span><strong>{{ formatDuration(selected.durationMinutes) }}</strong></div><div><span>计费规则</span><strong>演示规则 v1</strong></div></div><div class="payment-steps"><div :class="{ done: true }"><i>1</i><span>出场已匹配</span></div><div :class="{ done: selected.paymentStatus !== 'pending' }"><i>2</i><span>{{ selected.paymentStatus === 'not_required' ? '无需支付' : selected.paymentStatus === 'paid' ? '已支付' : '待支付' }}</span></div><div :class="{ done: selected.status === 'left' }"><i>3</i><span>车辆通过</span></div></div><div class="payment-actions"><el-button v-if="selected.status === 'pending_payment'" type="primary" size="large" :loading="busy" @click="pay"><el-icon v-if="!busy"><Wallet /></el-icon> 演示确认支付</el-button><el-button v-if="selected.status === 'ready_to_leave'" type="success" size="large" :loading="busy" @click="pass"><el-icon v-if="!busy"><CircleCheck /></el-icon> 确认车辆通过</el-button><p>{{ selected.status === 'pending_payment' ? '完成收款确认后，车辆进入可通行状态。' : '支付状态与车辆通过状态分别记录。' }}</p></div></template><el-empty v-else description="请先在出入口值守台创建出场记录" /></section>
  </div>
  <section class="surface-card json-card wide-json"><JsonPanel :payload="store.lastPayload" title="最近一次操作 JSON" /></section>
</template>
