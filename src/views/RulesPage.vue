<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { calculateFee, formatMoney } from '../domain/parking'
import { useParkingStore } from '../stores/parking'

const store = useParkingStore()
const form = reactive({ freeMinutes: store.rule.freeMinutes, hourlyRateYuan: store.rule.hourlyRateFen / 100, dailyCapYuan: store.rule.dailyCapFen / 100 })
const demoMinutes = ref(95)
const demoFee = computed(() => calculateFee(demoMinutes.value, { freeMinutes: form.freeMinutes, hourlyRateFen: Math.round(form.hourlyRateYuan * 100), dailyCapFen: Math.round(form.dailyCapYuan * 100) }))
function save() {
  if (form.freeMinutes < 0 || form.hourlyRateYuan <= 0 || form.dailyCapYuan <= 0) { ElMessage.warning('请输入有效收费参数'); return }
  store.updateRule({ freeMinutes: form.freeMinutes, hourlyRateFen: Math.round(form.hourlyRateYuan * 100), dailyCapFen: Math.round(form.dailyCapYuan * 100) })
  ElMessage.success('演示收费规则已更新；仅影响后续出场报价')
}
</script>

<template>
  <div class="page-head"><div><span class="eyebrow">PRICING RULES</span><h1>收费规则</h1><p>配置演示计费参数，并模拟不同停车时长的应付金额。</p></div><span class="status-tag demo">演示规则 v1</span></div>
  <div class="rules-grid"><section class="surface-card rules-card"><div class="section-heading"><div><span class="eyebrow">RULE SETTINGS</span><h2>临时车收费参数</h2></div></div><div class="rule-form"><label>免费停车时长 <small>分钟</small></label><el-input-number v-model="form.freeMinutes" :min="0" :max="1440" /><label>每小时费用 <small>元 / 不足一小时按一小时</small></label><el-input-number v-model="form.hourlyRateYuan" :min="0.01" :max="10000" :precision="2" :step="1" /><label>每 24 小时封顶 <small>元</small></label><el-input-number v-model="form.dailyCapYuan" :min="0.01" :max="10000" :precision="2" :step="5" /><el-button type="primary" size="large" @click="save">保存演示规则</el-button></div></section><section class="surface-card simulator-card"><div class="section-heading"><div><span class="eyebrow">FARE SIMULATOR</span><h2>计费模拟</h2></div></div><p>输入停车分钟数，即时预览当前表单参数下的价格。</p><el-input-number v-model="demoMinutes" :min="0" :max="100000" /><span class="simulator-unit">分钟</span><div class="simulator-result"><span>预计应付</span><strong>{{ formatMoney(demoFee) }}</strong></div><div class="rule-notes"><p>停车不超过免费时长时为 ¥0.00。</p><p>超过免费时长后按实际停放时长向上取整到小时；每 24 小时按封顶金额计算。</p><p>这是前端演示算法。正式报价必须由后端按已发布规则版本生成。</p></div></section></div>
</template>
