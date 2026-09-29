<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Camera, CircleCheck, Warning, Wallet, Van } from '@element-plus/icons-vue'
import { formatMoney, formatTime } from '../domain/parking'
import { useParkingStore } from '../stores/parking'

const store = useParkingStore()
const router = useRouter()
const capacity = 120
const entries = computed(() => store.todayEvents.filter(e => e.direction === 'entry').length)
const exits = computed(() => store.todayEvents.filter(e => e.direction === 'exit').length)
const revenue = computed(() => store.sessions.filter(s => s.paidAt && new Date(s.paidAt).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + (s.amountFen || 0), 0))
const recent = computed(() => store.events.slice(0, 6))
</script>

<template>
  <div class="page-head hero-head">
    <div><span class="eyebrow">OPERATIONS OVERVIEW</span><h1>运营总览</h1><p>掌握车场运行状态，快速进入值守与收费流程。</p></div>
    <el-button type="primary" size="large" @click="router.push('/gate')">进入出入口值守 <el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
  </div>
  <div class="notice-strip"><el-icon><CircleCheck /></el-icon><span>车牌识别可通过服务端接入腾讯云；停车记录、支付确认与通行确认仍是本地演示，实际结果需以后端和设备状态为准。</span></div>
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-icon blue"><Van /></div><span>当前在场车辆</span><strong>{{ store.activeSessions.length }}</strong><small>含待支付与待通行</small></div>
    <div class="stat-card"><div class="stat-icon cyan"><Camera /></div><span>今日入场 / 出场</span><strong>{{ entries }} <em>/ {{ exits }}</em></strong><small>来自本次演示事件</small></div>
    <div class="stat-card"><div class="stat-icon green"><Wallet /></div><span>今日已确认收费</span><strong>{{ formatMoney(revenue) }}</strong><small>仅统计演示确认支付</small></div>
    <div class="stat-card"><div class="stat-icon amber"><Warning /></div><span>待处理异常</span><strong>{{ store.openExceptions.length }}</strong><small>重复入场 / 未匹配入场</small></div>
  </div>
  <div class="overview-grid">
    <section class="surface-card occupancy-card">
      <div class="section-heading"><div><span class="eyebrow">CAPACITY</span><h2>车位使用情况</h2></div><span class="subtle">演示车场 · 总车位 {{ capacity }}</span></div>
      <div class="occupancy-visual"><div class="ring" :style="{ '--p': `${Math.min(100, store.activeSessions.length / capacity * 100)}%` }"><div><strong>{{ Math.max(0, capacity - store.activeSessions.length) }}</strong><small>剩余车位</small></div></div><div class="occupancy-legend"><div><i class="dot occupied"></i><span>已占用</span><b>{{ store.activeSessions.length }}</b></div><div><i class="dot free"></i><span>可使用</span><b>{{ Math.max(0, capacity - store.activeSessions.length) }}</b></div><p>入口创建记录后车位数即时更新，离场确认后释放车位。</p></div></div>
    </section>
    <section class="surface-card lane-card">
      <div class="section-heading"><div><span class="eyebrow">LANE STATUS</span><h2>出入口车道</h2></div><span class="subtle">4 条演示车道</span></div>
      <div class="lane-list"><div v-for="lane in [{ id: 'IN-01', name: '入口 01', kind: '入口' }, { id: 'IN-02', name: '入口 02', kind: '入口' }, { id: 'OUT-01', name: '出口 01', kind: '出口' }, { id: 'OUT-02', name: '出口 02', kind: '出口' }]" :key="lane.id" class="lane-row"><div class="lane-badge"><Camera /></div><div><strong>{{ lane.name }}</strong><small>{{ lane.id }} · {{ lane.kind }}</small></div><span class="status-tag demo">演示车道</span></div></div>
    </section>
  </div>
  <div class="overview-grid lower-grid">
    <section class="surface-card recent-card"><div class="section-heading"><div><span class="eyebrow">LIVE FEED</span><h2>最近进出事件</h2></div><el-button text type="primary" @click="router.push('/records')">查看全部 <el-icon><ArrowRight /></el-icon></el-button></div><div v-if="recent.length" class="activity-list"><div v-for="event in recent" :key="event.eventId" class="activity-row"><span class="activity-direction" :class="event.direction">{{ event.direction === 'entry' ? '入' : '出' }}</span><strong class="plate-text">{{ event.plateNo }}</strong><span>{{ event.laneId }}</span><time>{{ formatTime(event.capturedAt) }}</time></div></div><el-empty v-else description="暂无车辆事件" /></section>
    <section class="surface-card action-card"><div class="section-heading"><div><span class="eyebrow">QUICK ACTIONS</span><h2>常用工作入口</h2></div></div><button type="button" class="quick-action" @click="router.push('/gate')"><span class="quick-icon blue"><Camera /></span><span><strong>处理车辆进出</strong><small>识别车牌、记录入口与出口事件</small></span><ArrowRight /></button><button type="button" class="quick-action" @click="router.push('/cashier')"><span class="quick-icon green"><Wallet /></span><span><strong>确认收费与通行</strong><small>{{ store.pendingSessions.length }} 辆车等待后续处理</small></span><ArrowRight /></button><button type="button" class="quick-action" @click="router.push('/exceptions')"><span class="quick-icon amber"><Warning /></span><span><strong>查看异常事件</strong><small>{{ store.openExceptions.length }} 项待处理</small></span><ArrowRight /></button></section>
  </div>
</template>
