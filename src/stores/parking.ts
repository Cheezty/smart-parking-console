import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_RULE, calculateFee, durationInMinutes, id,
  type ParkingEvent, type ParkingException, type ParkingSession,
  type PricingRule,
} from '../domain/parking'

interface Snapshot {
  events: ParkingEvent[]
  sessions: ParkingSession[]
  exceptions: ParkingException[]
  rule: PricingRule
}

const STORAGE_KEY = 'smart-parking-demo-v1'

function sampleData(): Snapshot {
  const now = Date.now()
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60000).toISOString()
  const samples = [
    { plate: '京A8K56P', lane: 'IN-01', minutes: 78 },
    { plate: '沪B3F21M', lane: 'IN-02', minutes: 192 },
    { plate: '粤C7N88Q', lane: 'IN-01', minutes: 27 },
  ]
  const events: ParkingEvent[] = []
  const sessions: ParkingSession[] = []
  for (const item of samples) {
    const sessionId = id('PS')
    const entryEventId = id('EV')
    const entryAt = minutesAgo(item.minutes)
    events.push({ eventId: entryEventId, sessionId, direction: 'entry', plateNo: item.plate, laneId: item.lane, capturedAt: entryAt, confidence: 0.96, recognitionSource: 'demo' })
    sessions.push({ sessionId, plateNo: item.plate, entryEventId, entryAt, entryLaneId: item.lane, exitEventId: null, exitAt: null, exitLaneId: null, durationMinutes: null, amountFen: null, paymentStatus: 'not_required', status: 'parked', paidAt: null, leftAt: null })
  }
  events.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  sessions.sort((a, b) => b.entryAt.localeCompare(a.entryAt))
  return { events, sessions, exceptions: [], rule: { ...DEFAULT_RULE } }
}

function initialData(): Snapshot {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Snapshot
      if (Array.isArray(parsed.events) && Array.isArray(parsed.sessions) && Array.isArray(parsed.exceptions) && parsed.rule) return parsed
    }
  } catch { /* Private mode may disable storage; in-memory mode still works. */ }
  return sampleData()
}

export const useParkingStore = defineStore('parking', () => {
  const initial = initialData()
  const events = ref<ParkingEvent[]>(initial.events)
  const sessions = ref<ParkingSession[]>(initial.sessions)
  const exceptions = ref<ParkingException[]>(initial.exceptions)
  const rule = ref<PricingRule>(initial.rule)
  const lastPayload = ref<object | null>(null)

  const activeSessions = computed(() => sessions.value.filter(s => s.status !== 'left'))
  const parkedSessions = computed(() => sessions.value.filter(s => s.status === 'parked'))
  const pendingSessions = computed(() => sessions.value.filter(s => s.status === 'pending_payment' || s.status === 'ready_to_leave'))
  const openExceptions = computed(() => exceptions.value.filter(e => e.status === 'open'))
  const todayEvents = computed(() => events.value.filter(e => new Date(e.capturedAt).toDateString() === new Date().toDateString()))

  watch([events, sessions, exceptions, rule], () => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ events: events.value, sessions: sessions.value, exceptions: exceptions.value, rule: rule.value })) } catch { /* Continue in memory. */ }
  }, { deep: true })

  function recordEntry(plateNo: string, laneId: string, confidence: number | null, recognitionSource: ParkingEvent['recognitionSource'], meta?: { plateColor: string | null; providerRequestId: string | null }) {
    const capturedAt = new Date().toISOString()
    const event: ParkingEvent = { eventId: id('EV'), sessionId: null, direction: 'entry', plateNo, laneId, capturedAt, confidence, recognitionSource, plateColor: meta?.plateColor ?? null, providerRequestId: meta?.providerRequestId ?? null }
    const duplicate = activeSessions.value.find(s => s.plateNo === plateNo)
    if (duplicate) {
      const exception: ParkingException = { exceptionId: id('EX'), eventId: event.eventId, plateNo, laneId, type: 'duplicate_entry', occurredAt: capturedAt, status: 'open' }
      events.value.unshift(event)
      exceptions.value.unshift(exception)
      lastPayload.value = { event, exception, error: 'DUPLICATE_ENTRY' }
      return { event, exception, session: null }
    }
    const session: ParkingSession = {
      sessionId: id('PS'), plateNo, entryEventId: event.eventId, entryAt: capturedAt, entryLaneId: laneId,
      exitEventId: null, exitAt: null, exitLaneId: null, durationMinutes: null, amountFen: null,
      paymentStatus: 'not_required', status: 'parked', paidAt: null, leftAt: null,
    }
    event.sessionId = session.sessionId
    events.value.unshift(event)
    sessions.value.unshift(session)
    lastPayload.value = { event, session }
    return { event, exception: null, session }
  }

  function recordExit(plateNo: string, laneId: string, confidence: number | null, recognitionSource: ParkingEvent['recognitionSource'], meta?: { plateColor: string | null; providerRequestId: string | null }) {
    const capturedAt = new Date().toISOString()
    const event: ParkingEvent = { eventId: id('EV'), sessionId: null, direction: 'exit', plateNo, laneId, capturedAt, confidence, recognitionSource, plateColor: meta?.plateColor ?? null, providerRequestId: meta?.providerRequestId ?? null }
    const match = parkedSessions.value.find(s => s.plateNo === plateNo)
    if (!match) {
      const exception: ParkingException = { exceptionId: id('EX'), eventId: event.eventId, plateNo, laneId, type: 'entry_not_found', occurredAt: capturedAt, status: 'open' }
      events.value.unshift(event)
      exceptions.value.unshift(exception)
      lastPayload.value = { event, exception, error: 'ENTRY_NOT_FOUND' }
      return { event, exception, session: null }
    }
    const durationMinutes = durationInMinutes(match.entryAt, capturedAt)
    const amountFen = calculateFee(durationMinutes, rule.value)
    event.sessionId = match.sessionId
    const updated: ParkingSession = {
      ...match, exitEventId: event.eventId, exitAt: capturedAt, exitLaneId: laneId, durationMinutes,
      amountFen, paymentStatus: amountFen === 0 ? 'not_required' : 'pending',
      status: amountFen === 0 ? 'ready_to_leave' : 'pending_payment',
    }
    events.value.unshift(event)
    sessions.value = sessions.value.map(s => s.sessionId === match.sessionId ? updated : s)
    lastPayload.value = { event, session: updated, quote: { durationMinutes, amountFen, paymentStatus: updated.paymentStatus, rule: rule.value } }
    return { event, exception: null, session: updated }
  }

  function confirmPayment(sessionId: string): ParkingSession | null {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session || session.status !== 'pending_payment') return null
    const updated: ParkingSession = { ...session, paymentStatus: 'paid', status: 'ready_to_leave', paidAt: new Date().toISOString() }
    sessions.value = sessions.value.map(s => s.sessionId === sessionId ? updated : s)
    lastPayload.value = { session: updated, payment: { sessionId, amountFen: updated.amountFen, status: 'paid', paidAt: updated.paidAt, source: 'demo_manual_confirmation' } }
    return updated
  }

  function confirmPassage(sessionId: string): ParkingSession | null {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session || session.status !== 'ready_to_leave') return null
    const updated: ParkingSession = { ...session, status: 'left', leftAt: new Date().toISOString() }
    sessions.value = sessions.value.map(s => s.sessionId === sessionId ? updated : s)
    lastPayload.value = { session: updated, passage: { sessionId, status: 'passed', passedAt: updated.leftAt, source: 'demo_manual_confirmation' } }
    return updated
  }

  function updateRule(next: PricingRule) {
    rule.value = { ...next }
    lastPayload.value = { rule: rule.value, note: '仅影响后续出场报价' }
  }

  function resolveException(exceptionId: string, reason: string) {
    exceptions.value = exceptions.value.map(e => e.exceptionId === exceptionId ? { ...e, status: 'resolved', resolutionReason: reason, resolvedAt: new Date().toISOString() } : e)
    const resolved = exceptions.value.find(e => e.exceptionId === exceptionId)
    if (resolved) lastPayload.value = { exception: resolved }
  }

  function resetDemo() {
    const fresh = sampleData()
    events.value = fresh.events
    sessions.value = fresh.sessions
    exceptions.value = fresh.exceptions
    rule.value = fresh.rule
    lastPayload.value = null
  }

  return { events, sessions, exceptions, rule, lastPayload, activeSessions, parkedSessions, pendingSessions, openExceptions, todayEvents,
    recordEntry, recordExit, confirmPayment, confirmPassage, updateRule, resolveException, resetDemo }
})
