import { LIMITS } from './constants'

export class LineBreakTransformer implements Transformer<string, string> {
  private buffer = ''

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk
    const parts = this.buffer.split(/\r?\n/)
    this.buffer = parts.pop() ?? ''
    for (const line of parts) controller.enqueue(line)

    if (this.buffer.length > LIMITS.MAX_LINE_CHARS) {
      controller.enqueue(this.buffer.slice(0, LIMITS.MAX_LINE_CHARS))
      this.buffer = ''
    }
  }
}
