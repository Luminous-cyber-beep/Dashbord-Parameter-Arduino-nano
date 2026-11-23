import { describe, expect, it } from 'vitest'
import { LIMITS } from '../lib/constants'
import { LineBreakTransformer } from '../lib/lineBreakTransformer'

function feed(...chunks: string[]): string[] {
  const transformer = new LineBreakTransformer()
  const output: string[] = []
  const controller = {
    enqueue: (line: string) => { output.push(line) },
  } as unknown as TransformStreamDefaultController<string>

  for (const chunk of chunks) transformer.transform(chunk, controller)
  return output
}

describe('LineBreakTransformer', () => {
  it('menunggu newline sebelum meneruskan JSON yang terbelah', () => {
    const line = '{"temp":28.5,"alt":120.4,"press":998.2}'
    expect(feed('{"temp":28.5,"al', 't":120.4,"press":998.2}\n')).toEqual([line])
  })

  it('menerima CRLF dalam satu chunk', () => {
    expect(feed('baris1\r\nbaris2\r\n')).toEqual(['baris1', 'baris2'])
  })

  it('memisahkan beberapa baris dalam satu chunk', () => {
    expect(feed('a\nb\nc\n')).toEqual(['a', 'b', 'c'])
  })

  it('menangani \\r dan \\n yang terpisah di dua chunk', () => {
    expect(feed('a\r', '\nb\n')).toEqual(['a', 'b'])
  })

  it('menyimpan baris tanpa newline di buffer', () => {
    expect(feed('bagian')).toEqual([])
    expect(feed('bagian', ' berikutnya\n')).toEqual(['bagian berikutnya'])
  })

  it('memotong baris tanpa newline yang melebihi batas', () => {
    const long = 'x'.repeat(LIMITS.MAX_LINE_CHARS + 10)
    expect(feed(long)).toEqual(['x'.repeat(LIMITS.MAX_LINE_CHARS)])
  })
})
