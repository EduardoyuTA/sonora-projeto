import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleLinkDownloadRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void>
