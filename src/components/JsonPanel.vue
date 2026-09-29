<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ payload: object | null; title?: string }>()
const json = computed(() => props.payload ? JSON.stringify(props.payload, null, 2) : '')

async function copy() {
  if (!json.value) return
  try { await navigator.clipboard.writeText(json.value); ElMessage.success('JSON 已复制') }
  catch { ElMessage.error('复制失败，请手动选中文本') }
}
</script>

<template>
  <div class="json-panel">
    <div class="section-heading">
      <div><span class="eyebrow">DATA PAYLOAD</span><h3>{{ title || '数据库写入 JSON' }}</h3></div>
      <el-button text type="primary" :disabled="!payload" @click="copy">复制 JSON</el-button>
    </div>
    <pre v-if="payload">{{ json }}</pre>
    <div v-else class="json-empty">完成一次入场或出场操作后，这里会显示结构化数据。</div>
  </div>
</template>
