import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useParkingStore } from './parking'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T08:00:00.000Z'))
})

describe('入出场状态流转', () => {
  it('建立入场记录，出场计费，支付后确认通过', () => {
    const store = useParkingStore()
    const entry = store.recordEntry('浙A12345', 'IN-01', 0.98, 'demo')
    expect(entry.session?.entryLaneId).toBe('IN-01')
    expect(entry.event.direction).toBe('entry')
    vi.advanceTimersByTime(61 * 60 * 1000)
    const exit = store.recordExit('浙A12345', 'OUT-02', 0.97, 'demo')
    expect(exit.session?.durationMinutes).toBe(61)
    expect(exit.session?.amountFen).toBe(1000)
    expect(exit.session?.paymentStatus).toBe('pending')
    expect(store.confirmPassage(exit.session!.sessionId)).toBeNull()
    expect(store.confirmPayment(exit.session!.sessionId)?.status).toBe('ready_to_leave')
    expect(store.confirmPassage(exit.session!.sessionId)?.status).toBe('left')
    expect(store.activeSessions.some(s => s.sessionId === exit.session!.sessionId)).toBe(false)
  })

  it('重复入场与未找到入场记录保留事件并生成异常', () => {
    const store = useParkingStore()
    const existing = store.parkedSessions.length
    const duplicate = store.recordEntry('京A8K56P', 'IN-02', null, 'manual')
    expect(duplicate.session).toBeNull()
    expect(duplicate.exception?.type).toBe('duplicate_entry')
    expect(store.parkedSessions.length).toBe(existing)
    const unmatched = store.recordExit('闽A12345', 'OUT-01', null, 'manual')
    expect(unmatched.session).toBeNull()
    expect(unmatched.exception?.type).toBe('entry_not_found')
    expect(store.openExceptions).toHaveLength(2)
  })
})
