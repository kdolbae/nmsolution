'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 브라우저 음성 인식(Web Speech API, ko-KR)으로 글을 받아 적는다. Chrome·Edge·Safari 에서 됨.
 * 확정된 문장은 onText 로 넘기고, 말하는 중인 문장은 interim 으로 보여 준다.
 */
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function factory(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const rec = useRef<Recognition | null>(null)
  const cb = useRef(onText)
  cb.current = onText

  useEffect(() => {
    setSupported(!!factory())
  }, [])

  const stop = useCallback(() => {
    rec.current?.stop()
    rec.current = null
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const F = factory()
    if (!F) return
    const r = new F()
    r.lang = 'ko-KR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) cb.current(res[0].transcript.trim())
        else live += res[0].transcript
      }
      setInterim(live)
    }
    r.onerror = (e) => {
      setError(e.error === 'not-allowed' ? '마이크 사용을 허용해 주세요.' : e.error === 'no-speech' ? '' : `음성 인식 오류: ${e.error}`)
    }
    r.onend = () => {
      // 브라우저가 중간에 끊으면 듣는 중인 동안 다시 시작한다
      if (rec.current === r) {
        try {
          r.start()
        } catch {
          setListening(false)
          rec.current = null
        }
      }
    }
    rec.current = r
    setError('')
    r.start()
    setListening(true)
  }, [])

  useEffect(() => () => rec.current?.stop(), [])

  return { supported, listening, interim, error, start, stop, toggle: () => (listening ? stop() : start()) }
}
