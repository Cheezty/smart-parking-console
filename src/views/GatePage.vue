<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { Camera, CircleCheck, Delete, RefreshRight, UploadFilled, Warning } from '@element-plus/icons-vue'
import { formatDuration, formatMoney, formatTime, isValidPlate, type ParkingEvent, type ParkingSession } from '../domain/parking'
import { useParkingStore } from '../stores/parking'
import { recognizePlate, type PlateCandidate } from '../services/recognition'
import JsonPanel from '../components/JsonPanel.vue'

const store = useParkingStore()
const entryPlate = ref('')
const exitPlate = ref('')
const entryLane = ref('IN-01')
const exitLane = ref('OUT-01')
const entrySource = ref<ParkingEvent['recognitionSource']>('manual')
const exitSource = ref<ParkingEvent['recognitionSource']>('manual')
const entryConfidence = ref<number | null>(null)
const exitConfidence = ref<number | null>(null)
const entryCandidates = ref<PlateCandidate[]>([])
const exitCandidates = ref<PlateCandidate[]>([])
const entryRequestId = ref<string | null>(null)
const exitRequestId = ref<string | null>(null)
const entryCandidateConfirmed = ref(true)
const exitCandidateConfirmed = ref(true)
const entryFile = ref<File | null>(null)
const exitFile = ref<File | null>(null)
const entryPreview = ref('')
const exitPreview = ref('')
const entryBusy = ref(false)
const exitBusy = ref(false)
const result = ref<ParkingSession | null>(null)
const resultDirection = ref<'entry' | 'exit' | null>(null)
const latestParked = computed(() => store.parkedSessions[0])

function setFile(upload: UploadFile, direction: 'entry' | 'exit') {
  const file = upload.raw
  if (!file) return
  if (file.size > 4 * 1024 * 1024) { ElMessage.error('图片不能超过 4 MB'); return }
  if (!['image/jpeg', 'image/png'].includes(file.type)) { ElMessage.error('只支持 JPG 或 PNG 图片'); return }
  if (direction === 'entry') {
    if (entryPreview.value) URL.revokeObjectURL(entryPreview.value)
    entryFile.value = file
    entryPreview.value = URL.createObjectURL(file)
    entryCandidates.value = []
    entryRequestId.value = null
    entryCandidateConfirmed.value = true
    entryPlate.value = ''
    entryConfidence.value = null
    entrySource.value = 'manual'
  } else {
    if (exitPreview.value) URL.revokeObjectURL(exitPreview.value)
    exitFile.value = file
    exitPreview.value = URL.createObjectURL(file)
    exitCandidates.value = []
    exitRequestId.value = null
    exitCandidateConfirmed.value = true
    exitPlate.value = ''
    exitConfidence.value = null
    exitSource.value = 'manual'
  }
}
function setEntryFile(upload: UploadFile) { setFile(upload, 'entry') }
function setExitFile(upload: UploadFile) { setFile(upload, 'exit') }
onUnmounted(() => { if (entryPreview.value) URL.revokeObjectURL(entryPreview.value); if (exitPreview.value) URL.revokeObjectURL(exitPreview.value) })

function demoRecognize(direction: 'entry' | 'exit') {
  if (direction === 'entry') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const plate = '苏E' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    entryPlate.value = plate
    entrySource.value = 'demo'
    entryConfidence.value = 0.98
    entryCandidates.value = []
    entryRequestId.value = null
    entryCandidateConfirmed.value = true
  } else {
    if (!latestParked.value) { ElMessage.warning('当前没有可出场车辆，请先创建入场记录'); return }
    exitPlate.value = latestParked.value.plateNo
    exitSource.value = 'demo'
    exitConfidence.value = 0.97
    exitCandidates.value = []
    exitRequestId.value = null
    exitCandidateConfirmed.value = true
  }
  ElMessage.success('已填入模拟识别结果')
}

function selectCandidate(candidate: PlateCandidate, direction: 'entry' | 'exit') {
  if (direction === 'entry') { entryPlate.value = candidate.plateNo; entryConfidence.value = candidate.confidence; entrySource.value = 'api'; entryCandidateConfirmed.value = true }
  else { exitPlate.value = candidate.plateNo; exitConfidence.value = candidate.confidence; exitSource.value = 'api'; exitCandidateConfirmed.value = true }
}

function onManualInput(direction: 'entry' | 'exit') {
  if (direction === 'entry') { entrySource.value = 'manual'; entryConfidence.value = null; entryCandidates.value = []; entryRequestId.value = null; entryCandidateConfirmed.value = true }
  else { exitSource.value = 'manual'; exitConfidence.value = null; exitCandidates.value = []; exitRequestId.value = null; exitCandidateConfirmed.value = true }
}

async function runRecognition(direction: 'entry' | 'exit') {
  const file = direction === 'entry' ? entryFile.value : exitFile.value
  if (!file) { ElMessage.warning('请先上传抓拍图片'); return }
  if (direction === 'entry') entryBusy.value = true
  else exitBusy.value = true
  try {
    const data = await recognizePlate(file)
    if (direction === 'entry') { entryPlate.value = data.plateNo; entryConfidence.value = data.confidence; entrySource.value = data.source; entryCandidates.value = data.candidates; entryRequestId.value = data.requestId; entryCandidateConfirmed.value = data.candidates.length <= 1 }
    else { exitPlate.value = data.plateNo; exitConfidence.value = data.confidence; exitSource.value = data.source; exitCandidates.value = data.candidates; exitRequestId.value = data.requestId; exitCandidateConfirmed.value = data.candidates.length <= 1 }
    if (data.candidates.length > 1) ElMessage.warning(`识别到 ${data.candidates.length} 个车牌，请选择当前车道车辆`)
    else ElMessage.success('车牌识别完成，请核对后提交')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '车牌识别失败') }
  finally { if (direction === 'entry') entryBusy.value = false; else exitBusy.value = false }
}

function submit(direction: 'entry' | 'exit') {
  const plate = (direction === 'entry' ? entryPlate.value : exitPlate.value).trim().toUpperCase()
  if ((direction === 'entry' && !entryCandidateConfirmed.value) || (direction === 'exit' && !exitCandidateConfirmed.value)) { ElMessage.warning('识别到多个车牌，请先选择当前车辆'); return }
  if (!isValidPlate(plate)) { ElMessage.warning('请输入有效车牌，例如 京A12345；新能源车可输入 8 位'); return }
  if (direction === 'entry') {
    const selected = entryCandidates.value.find(candidate => candidate.plateNo === plate)
    const response = store.recordEntry(plate, entryLane.value, entryConfidence.value, entrySource.value, { plateColor: selected?.color ?? null, providerRequestId: entryRequestId.value })
    result.value = response.session
    resultDirection.value = 'entry'
    if (response.exception) ElMessage.error('该车牌已有在场记录，已进入异常处理')
    else { ElMessage.success('入场记录已创建'); entryPlate.value = ''; entryConfidence.value = null; entrySource.value = 'manual' }
  } else {
    const selected = exitCandidates.value.find(candidate => candidate.plateNo === plate)
    const response = store.recordExit(plate, exitLane.value, exitConfidence.value, exitSource.value, { plateColor: selected?.color ?? null, providerRequestId: exitRequestId.value })
    result.value = response.session
    resultDirection.value = 'exit'
    if (response.exception) ElMessage.error('未找到对应入场记录，已进入异常处理')
    else { ElMessage.success('出场匹配与计费完成'); exitPlate.value = ''; exitConfidence.value = null; exitSource.value = 'manual' }
  }
}
</script>

<template>
  <div class="page-head"><div><span class="eyebrow">LANE OPERATIONS</span><h1>出入口值守</h1><p>上传抓拍图调用腾讯云识别，核对车牌后生成进出场事件。</p></div><div class="head-status"><span class="pulse-dot"></span> 车道模拟运行中</div></div>
  <div class="workflow-banner"><span>01 识别车牌</span><i></i><span>02 记录进出</span><i></i><span>03 匹配与计费</span><i></i><span>04 支付及通行</span></div>
  <div class="gate-grid">
    <section class="surface-card gate-card">
      <div class="gate-title"><span class="gate-number">01 / ENTRY</span><h2>车辆入场</h2><span class="status-tag success">入口车道</span></div>
      <div class="capture-frame" :class="{ 'has-image': entryPreview }"><img v-if="entryPreview" :src="entryPreview" alt="入场抓拍预览" /><div v-else class="capture-placeholder"><el-icon><Camera /></el-icon><strong>等待入场抓拍</strong><small>可上传抓拍图并接入识别服务</small></div><span class="capture-label">ENTRY CAMERA · {{ entryLane }}</span></div>
      <div class="capture-actions"><el-upload :auto-upload="false" :show-file-list="false" accept="image/jpeg,image/png" :on-change="setEntryFile"><el-button><el-icon><UploadFilled /></el-icon> 上传抓拍</el-button></el-upload><el-button :loading="entryBusy" @click="runRecognition('entry')"><el-icon v-if="!entryBusy"><RefreshRight /></el-icon> 接口识别</el-button><el-button type="primary" plain @click="demoRecognize('entry')">模拟识别</el-button></div>
      <div v-if="entryCandidates.length" class="candidate-panel"><strong>识别候选 {{ entryCandidates.length > 1 ? '· 请选择当前车辆' : '' }}</strong><div class="candidate-list"><button v-for="(candidate, index) in entryCandidates" :key="`${candidate.plateNo}-${index}`" type="button" :class="{ selected: entryCandidateConfirmed && entryPlate === candidate.plateNo }" @click="selectCandidate(candidate, 'entry')"><b>{{ candidate.plateNo }}</b><small>{{ candidate.color || '颜色未知' }} · {{ candidate.confidence === null ? '置信度未知' : `${Math.round(candidate.confidence * 100)}%` }}</small></button></div><small v-if="entryRequestId">请求编号 {{ entryRequestId }}</small></div>
      <div class="form-divider"></div>
      <div class="field-row"><label>入口编号</label><el-select v-model="entryLane"><el-option label="入口 01 · IN-01" value="IN-01" /><el-option label="入口 02 · IN-02" value="IN-02" /></el-select></div>
      <div class="field-row"><label>识别车牌</label><el-input v-model="entryPlate" maxlength="8" placeholder="例如：京A12345" @input="onManualInput('entry')"><template #prefix><span class="input-plate-icon">车牌</span></template></el-input></div>
      <div class="recognition-meta"><span>识别来源：{{ entrySource === 'demo' ? '模拟识别' : entrySource === 'api' ? '识别接口' : '人工录入' }}</span><span>置信度：{{ entryConfidence === null ? '—' : `${Math.round(entryConfidence * 100)}%` }}</span></div>
      <el-button class="primary-action" type="primary" size="large" @click="submit('entry')"><el-icon><CircleCheck /></el-icon> 确认车辆入场</el-button>
    </section>
    <section class="surface-card gate-card exit-card">
      <div class="gate-title"><span class="gate-number">02 / EXIT</span><h2>车辆出场</h2><span class="status-tag info">出口车道</span></div>
      <div class="capture-frame" :class="{ 'has-image': exitPreview }"><img v-if="exitPreview" :src="exitPreview" alt="出场抓拍预览" /><div v-else class="capture-placeholder"><el-icon><Camera /></el-icon><strong>等待出场抓拍</strong><small>匹配在场车辆并生成费用</small></div><span class="capture-label">EXIT CAMERA · {{ exitLane }}</span></div>
      <div class="capture-actions"><el-upload :auto-upload="false" :show-file-list="false" accept="image/jpeg,image/png" :on-change="setExitFile"><el-button><el-icon><UploadFilled /></el-icon> 上传抓拍</el-button></el-upload><el-button :loading="exitBusy" @click="runRecognition('exit')"><el-icon v-if="!exitBusy"><RefreshRight /></el-icon> 接口识别</el-button><el-button type="primary" plain @click="demoRecognize('exit')">模拟识别</el-button></div>
      <div v-if="exitCandidates.length" class="candidate-panel"><strong>识别候选 {{ exitCandidates.length > 1 ? '· 请选择当前车辆' : '' }}</strong><div class="candidate-list"><button v-for="(candidate, index) in exitCandidates" :key="`${candidate.plateNo}-${index}`" type="button" :class="{ selected: exitCandidateConfirmed && exitPlate === candidate.plateNo }" @click="selectCandidate(candidate, 'exit')"><b>{{ candidate.plateNo }}</b><small>{{ candidate.color || '颜色未知' }} · {{ candidate.confidence === null ? '置信度未知' : `${Math.round(candidate.confidence * 100)}%` }}</small></button></div><small v-if="exitRequestId">请求编号 {{ exitRequestId }}</small></div>
      <div class="form-divider"></div>
      <div class="field-row"><label>出口编号</label><el-select v-model="exitLane"><el-option label="出口 01 · OUT-01" value="OUT-01" /><el-option label="出口 02 · OUT-02" value="OUT-02" /></el-select></div>
      <div class="field-row"><label>识别车牌</label><el-input v-model="exitPlate" maxlength="8" placeholder="输入在场车辆车牌" @input="onManualInput('exit')"><template #prefix><span class="input-plate-icon">车牌</span></template></el-input></div>
      <div class="recognition-meta"><span>识别来源：{{ exitSource === 'demo' ? '模拟识别' : exitSource === 'api' ? '识别接口' : '人工录入' }}</span><span>置信度：{{ exitConfidence === null ? '—' : `${Math.round(exitConfidence * 100)}%` }}</span></div>
      <el-button class="primary-action" type="primary" size="large" @click="submit('exit')"><el-icon><CircleCheck /></el-icon> 匹配出场并计费</el-button>
    </section>
  </div>
  <div class="gate-results">
    <section class="surface-card result-card"><div class="section-heading"><div><span class="eyebrow">LATEST RESULT</span><h2>本次处理结果</h2></div></div><template v-if="result"><div class="result-plate"><strong>{{ result.plateNo }}</strong><span class="status-tag" :class="resultDirection === 'entry' ? 'success' : 'warning'">{{ resultDirection === 'entry' ? '已入场' : result.status === 'pending_payment' ? '待支付' : '可通行' }}</span></div><div class="detail-list"><div><span>入场时间</span><strong>{{ formatTime(result.entryAt) }}</strong></div><div><span>入口编号</span><strong>{{ result.entryLaneId }}</strong></div><div v-if="resultDirection === 'exit'"><span>出场时间</span><strong>{{ formatTime(result.exitAt) }}</strong></div><div v-if="resultDirection === 'exit'"><span>出口编号</span><strong>{{ result.exitLaneId }}</strong></div><div v-if="resultDirection === 'exit'"><span>停车时长</span><strong>{{ formatDuration(result.durationMinutes) }}</strong></div><div v-if="resultDirection === 'exit'"><span>应付金额</span><strong class="amount-highlight">{{ formatMoney(result.amountFen) }}</strong></div><div v-if="resultDirection === 'exit'"><span>支付状态</span><strong>{{ result.paymentStatus === 'pending' ? '待支付' : '无需支付' }}</strong></div></div></template><div v-else class="result-empty"><el-icon><Warning /></el-icon><p>完成入场或出场操作后，在这里查看结果。</p></div></section>
    <section class="surface-card json-card"><JsonPanel :payload="store.lastPayload" /></section>
  </div>
  <p class="page-hint"><el-icon><Delete /></el-icon> 腾讯云识别需要先填写 .env 密钥；停车记录、收费和道闸仍为本地演示。</p>
</template>
