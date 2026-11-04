'use client'

import { useState } from 'react'
import { sendRecognition, type CreatedRecognition } from '@/lib/data-api'
import { validateRecognition, hasErrors, type FieldErrors } from '@/lib/validate'
import type { ValueKey } from '@/lib/mock-data'

/** The form snapshot submit needs at the moment the send is pressed. */
export interface SendInputSnapshot {
  toIds: string[]
  ccIds: string[]
  valueKey: ValueKey | null
  message: string
  points: number
  tplId: string | null
  /** Postcard banner resolved at send time (the chosen template variant). */
  artUrl: () => string | undefined
}

/**
 * Send half of the composer: validation errors, the sending/sent lifecycle,
 * the created recognition and a failure path that never strands the button.
 */
export function useSendRecognition(input: SendInputSnapshot) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [created, setCreated] = useState<CreatedRecognition | null>(null)

  const isBusy = () => status === 'sending'

  async function submit(): Promise<boolean> {
    if (!input.toIds.length) {
      setErrors((current) => ({ ...current, toIds: 'Pick a teammate to recognize.' }))
      return false
    }
    const validationErrors = validateRecognition({
      toIds: input.toIds,
      valueKey: input.valueKey,
      message: input.message,
      points: input.points,
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return false
    setStatus('sending')
    try {
      const createdRecognition = await sendRecognition({
        toIds: input.toIds,
        ccIds: input.ccIds,
        valueKey: input.valueKey!,
        message: input.message.trim(),
        points: input.points,
        artUrl: input.artUrl(),
        tplId: input.tplId ?? undefined,
      })
      setCreated(createdRecognition)
      setStatus('sent')
      return true
    } catch (err) {
      // sir's review: a failed send must NOT leave the button stuck on
      // 'sending' — surface an error state the user can see and retry from
      console.error('Recognition send failed', err)
      setErrors((current) => ({
        ...current,
        message: 'Sending failed. Please check your connection and try again.',
      }))
      setStatus('idle')
      return false
    }
  }

  return { errors, setErrors, status, created, submit, isBusy }
}

export type SendApi = ReturnType<typeof useSendRecognition>
