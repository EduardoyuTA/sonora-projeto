import type { IncomingMessage, ServerResponse } from 'node:http'

export const MAX_UPLOAD_BYTES: number
export function safeUnlink(filePath: string): void
export function applyCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigin?: string
): boolean
export function handleHealthRequest(
  req: IncomingMessage,
  res: ServerResponse
): void
export function handleConvertRequest(
  req: IncomingMessage,
  res: ServerResponse
): void
