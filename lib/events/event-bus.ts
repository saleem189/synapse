// ================================
// Event Bus
// ================================
// Event-driven architecture using Redis Pub/Sub
// Enables decoupled communication between services

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export interface EventPayload {
  event: string;
  data: any;
  id: string;
  timestamp: number;
  source?: string;
}

type EventHandler = (data: any) => void | Promise<void>;
type PatternEventHandler = (event: string, data: any) => void | Promise<void>;

export class EventBus {
  private redis: Redis;
  private subscribers = new Map<string, Set<EventHandler>>();
  private patternSubscribers = new Map<string, Set<PatternEventHandler>>();
  private subscriber: Redis | null = null;
  private patternSubscriber: Redis | null = null;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Publish an event
   */
  async publish(event: string, data: any, source?: string): Promise<void> {
    const payload: EventPayload = {
      event,
      data,
      id: uuidv4(),
      timestamp: Date.now(),
      source: source || 'api',
    };

    try {
      // Publish to Redis
      await this.redis.publish(`events:${event}`, JSON.stringify(payload));

      // Store in event log (for replay/debugging)
      await this.redis.lpush(`events:log:${event}`, JSON.stringify(payload));
      await this.redis.ltrim(`events:log:${event}`, 0, 999); // Keep last 1000

      // Store in global event log
      await this.redis.lpush('events:log:all', JSON.stringify(payload));
      await this.redis.ltrim('events:log:all', 0, 9999); // Keep last 10000

      logger.log(`📤 Event published: ${event} (${payload.id})`);
    } catch (error) {
      logger.error(`Error publishing event '${event}':`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a specific event
   */
  async subscribe(event: string, handler: EventHandler): Promise<() => void> {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());

      // Set up Redis subscription if not already done
      if (!this.subscriber) {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe(`events:${event}`);

        this.subscriber.on('message', (channel, message) => {
          try {
            const payload: EventPayload = JSON.parse(message);
            const handlers = this.subscribers.get(event);
            if (handlers) {
              handlers.forEach(h => {
                try {
                  const result = h(payload.data);
                  if (result instanceof Promise) {
                    result.catch(err => {
                      logger.error(`Error in event handler for '${event}':`, err);
                    });
                  }
                } catch (error) {
                  logger.error(`Error in event handler for '${event}':`, error);
                }
              });
            }
          } catch (error) {
            logger.error(`Error parsing event message for '${event}':`, error);
          }
        });
      } else {
        // Add subscription to existing subscriber
        await this.subscriber.subscribe(`events:${event}`);
      }
    }

    this.subscribers.get(event)!.add(handler);
    logger.log(`📥 Subscribed to event: ${event}`);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(handler);
      if (this.subscribers.get(event)?.size === 0) {
        this.subscribers.delete(event);
        this.subscriber?.unsubscribe(`events:${event}`);
      }
    };
  }

  /**
   * Subscribe to events matching a pattern
   */
  async subscribePattern(
    pattern: string,
    handler: PatternEventHandler
  ): Promise<() => void> {
    if (!this.patternSubscribers.has(pattern)) {
      this.patternSubscribers.set(pattern, new Set());

      // Set up pattern subscription if not already done
      if (!this.patternSubscriber) {
        this.patternSubscriber = this.redis.duplicate();
        await this.patternSubscriber.psubscribe(`events:${pattern}`);

        this.patternSubscriber.on('pmessage', (pattern, channel, message) => {
          try {
            const event = channel.replace('events:', '');
            const payload: EventPayload = JSON.parse(message);
            const handlers = this.patternSubscribers.get(pattern);
            if (handlers) {
              handlers.forEach(h => {
                try {
                  const result = h(event, payload.data);
                  if (result instanceof Promise) {
                    result.catch(err => {
                      logger.error(`Error in pattern handler for '${pattern}':`, err);
                    });
                  }
                } catch (error) {
                  logger.error(`Error in pattern handler for '${pattern}':`, error);
                }
              });
            }
          } catch (error) {
            logger.error(`Error parsing pattern event message:`, error);
          }
        });
      } else {
        await this.patternSubscriber.psubscribe(`events:${pattern}`);
      }
    }

    this.patternSubscribers.get(pattern)!.add(handler);
    logger.log(`📥 Subscribed to event pattern: ${pattern}`);

    return () => {
      this.patternSubscribers.get(pattern)?.delete(handler);
      if (this.patternSubscribers.get(pattern)?.size === 0) {
        this.patternSubscribers.delete(pattern);
        this.patternSubscriber?.punsubscribe(`events:${pattern}`);
      }
    };
  }

  /**
   * Get event history for a specific event
   */
  async getEventHistory(event: string, limit: number = 100): Promise<EventPayload[]> {
    try {
      const events = await this.redis.lrange(`events:log:${event}`, 0, limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      logger.error(`Error getting event history for '${event}':`, error);
      return [];
    }
  }

  /**
   * Get recent events from all events
   */
  async getRecentEvents(limit: number = 100): Promise<EventPayload[]> {
    try {
      const events = await this.redis.lrange('events:log:all', 0, limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      logger.error('Error getting recent events:', error);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.patternSubscriber) {
      await this.patternSubscriber.quit();
      this.patternSubscriber = null;
    }
    this.subscribers.clear();
    this.patternSubscribers.clear();
  }
}

