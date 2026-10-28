'use client'

import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeech } from './use-speech'

/** 마이크 버튼. 말한 문장을 onText 로 넘긴다. 듣는 중엔 빨갛게, 중간 인식은 옆에 흐리게 */
export function MicButton({ onText, size = 'sm' }: { onText: (t: string) => void; size?: 'sm' | 'default' }) {
  const s = useSpeech(onText)
  if (!s.supported)
    return (
      <span className="text-xs text-muted-foreground" title="Chrome·Edge·Safari 에서 음성 입력을 쓸 수 있습니다">
        음성 입력 미지원 브라우저
      </span>
    )
  return (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        size={size}
        variant={s.listening ? 'destructive' : 'outline'}
        className="rounded-none"
        onClick={s.toggle}
        title={s.listening ? '음성 입력 멈춤' : '마이크로 말해서 입력'}
      >
        {s.listening ? <MicOff /> : <Mic />} {s.listening ? '듣는 중 · 멈춤' : '음성 입력'}
      </Button>
      {s.interim && <span className="max-w-72 truncate text-xs text-muted-foreground">{s.interim}</span>}
      {s.error && <span className="text-xs text-destructive">{s.error}</span>}
    </span>
  )
}
