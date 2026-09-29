<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { DataAnalysis, Camera, Wallet, Van, Tickets, Warning, Setting, Fold, Expand, Bell, Clock, Connection } from '@element-plus/icons-vue'
import { formatTime } from './domain/parking'
import { useParkingStore } from './stores/parking'

const route = useRoute()
const router = useRouter()
const store = useParkingStore()
const collapsed = ref(false)
const now = ref(new Date().toISOString())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { now.value = new Date().toISOString() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const nav = [
  { path: '/', label: '运营总览', icon: DataAnalysis },
  { path: '/gate', label: '出入口值守', icon: Camera },
  { path: '/cashier', label: '收费工作台', icon: Wallet },
  { path: '/vehicles', label: '在场车辆', icon: Van },
  { path: '/records', label: '进出记录', icon: Tickets },
  { path: '/exceptions', label: '异常处理', icon: Warning },
  { path: '/rules', label: '收费规则', icon: Setting },
]
const currentTitle = computed(() => nav.find(item => item.path === route.path)?.label || '运营总览')

async function reset() {
  await ElMessageBox.confirm('将清空本次浏览器会话内的操作，恢复示例车辆。', '重置演示数据', { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' })
  store.resetDemo()
  router.push('/')
}
</script>

<template>
  <div class="app-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><span></span><span></span></div>
        <div v-if="!collapsed" class="brand-copy"><strong>泊序</strong><small>SMART PARKING</small></div>
      </div>
      <div v-if="!collapsed" class="nav-caption">工作空间</div>
      <nav class="nav-list" aria-label="主导航">
        <router-link v-for="item in nav" :key="item.path" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }" :title="item.label">
          <el-icon><component :is="item.icon" /></el-icon><span v-if="!collapsed">{{ item.label }}</span>
          <b v-if="!collapsed && item.path === '/exceptions' && store.openExceptions.length" class="nav-count">{{ store.openExceptions.length }}</b>
        </router-link>
      </nav>
      <div class="sidebar-foot">
        <div class="demo-pill"><span class="pulse-dot"></span><span v-if="!collapsed">本地演示模式</span></div>
        <button class="collapse-button" type="button" @click="collapsed = !collapsed"><el-icon><component :is="collapsed ? Expand : Fold" /></el-icon><span v-if="!collapsed">收起侧栏</span></button>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="topbar-left"><span class="breadcrumb">智慧停车 /</span><strong>{{ currentTitle }}</strong></div>
        <div class="topbar-right">
          <span class="top-status"><el-icon><Connection /></el-icon> 本地运行</span>
          <span class="top-status"><el-icon><Clock /></el-icon> 演示时间 {{ formatTime(now) }}</span>
          <button class="notification" type="button" title="查看异常" @click="router.push('/exceptions')"><el-icon><Bell /></el-icon><i v-if="store.openExceptions.length"></i></button>
          <div class="user-avatar">管</div>
        </div>
      </header>
      <main class="page-content"><router-view /></main>
      <footer class="app-footer">泊序智慧停车管理系统 · 前端演示环境 <button type="button" @click="reset">重置演示数据</button></footer>
    </div>
  </div>
</template>
