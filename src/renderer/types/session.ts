export type SessionState =
  | 'idle'
  | 'fetching_token'
  | 'connecting'
  | 'connected'
  | 'generating'
  | 'reconnecting'
  | 'disconnected'
  | 'error'
