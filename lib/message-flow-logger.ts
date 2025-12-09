// ================================
// Message Flow Logger
// ================================
// Centralized logging for tracking message flow from API → Socket Server → Clients
// All logs are written to a file for easy debugging

import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'message-flow.log');

interface LogEntry {
  timestamp: string;
  stage: 'API_RECEIVE' | 'API_BROADCAST' | 'SOCKET_RECEIVE' | 'SOCKET_BROADCAST' | 'CLIENT_RECEIVE' | 'ERROR';
  messageId?: string;
  roomId?: string;
  senderId?: string;
  details: Record<string, unknown>;
}

/**
 * Write log entry to file
 */
function writeLog(entry: LogEntry): void {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
    
    // Append to log file (create if doesn't exist)
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    
    // Also log to console for immediate visibility
    const emoji = {
      'API_RECEIVE': '📥',
      'API_BROADCAST': '📤',
      'SOCKET_RECEIVE': '🔌',
      'SOCKET_BROADCAST': '📡',
      'CLIENT_RECEIVE': '📨',
      'ERROR': '❌',
    }[entry.stage] || '📋';
    
    console.log(`${emoji} [${entry.stage}] ${entry.messageId || 'N/A'} | Room: ${entry.roomId || 'N/A'} | ${JSON.stringify(entry.details)}`);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Log when API route receives a message to save
 */
export function logApiReceive(
  messageId: string,
  roomId: string,
  senderId: string,
  content: string
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'API_RECEIVE',
    messageId,
    roomId,
    senderId,
    details: {
      action: 'API received message to save',
      content: content.substring(0, 50), // Truncate for readability
    },
  });
}

/**
 * Log when API route broadcasts message via socket
 */
export function logApiBroadcast(
  messageId: string,
  roomId: string,
  senderId: string,
  socketConnected: boolean,
  socketId?: string
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'API_BROADCAST',
    messageId,
    roomId,
    senderId,
    details: {
      action: 'API broadcasting to socket server',
      socketConnected,
      socketId,
    },
  });
}

/**
 * Log when socket server receives a message
 */
export function logSocketReceive(
  messageId: string,
  roomId: string,
  senderId: string,
  socketId: string,
  isFromAPI: boolean
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'SOCKET_RECEIVE',
    messageId,
    roomId,
    senderId,
    details: {
      action: 'Socket server received message',
      socketId,
      isFromAPI,
    },
  });
}

/**
 * Log when socket server broadcasts to clients
 */
export function logSocketBroadcast(
  messageId: string,
  roomId: string,
  senderId: string,
  broadcastType: 'all' | 'except-sender',
  clientCount?: number
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'SOCKET_BROADCAST',
    messageId,
    roomId,
    senderId,
    details: {
      action: 'Socket server broadcasting to clients',
      broadcastType,
      clientCount,
    },
  });
}

/**
 * Log when client receives a message
 */
export function logClientReceive(
  messageId: string,
  roomId: string,
  senderId: string,
  receiverId: string,
  socketId: string
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'CLIENT_RECEIVE',
    messageId,
    roomId,
    senderId,
    details: {
      action: 'Client received message',
      receiverId,
      socketId,
    },
  });
}

/**
 * Log errors in the message flow
 */
export function logError(
  stage: LogEntry['stage'],
  messageId: string | undefined,
  roomId: string | undefined,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    stage: 'ERROR',
    messageId,
    roomId,
    details: {
      action: 'Error in message flow',
      stage,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    },
  });
}

/**
 * Clear the log file (useful for testing)
 */
export function clearLog(): void {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
    }
  } catch (error) {
    console.error('Failed to clear log file:', error);
  }
}

/**
 * Read recent log entries
 */
export function readRecentLogs(limit: number = 50): LogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);
    
    return entries;
  } catch (error) {
    console.error('Failed to read log file:', error);
    return [];
  }
}

