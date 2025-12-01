// ================================
// Dependency Injection Container
// ================================
// Centralized service instantiation and dependency management
// Supports both synchronous and asynchronous factory registration
// Enables runtime service selection via configuration

import { ConfigService } from '@/lib/config/config.service';
import { logger } from '@/lib/logger';

type Factory<T> = () => T | Promise<T>;
type AsyncFactory<T> = (config?: any) => Promise<T>;

class DIContainer {
  private services = new Map<string, Factory<any>>();
  private factories = new Map<string, AsyncFactory<any>>();
  private singletons = new Map<string, any>();
  private configService: ConfigService | null = null;

  /**
   * Set the config service (required for factory support)
   */
  setConfigService(configService: ConfigService): void {
    this.configService = configService;
  }

  /**
   * Register a service factory (synchronous or asynchronous)
   * @param key - Service identifier
   * @param factory - Factory function that creates the service
   * @param singleton - Whether to cache the instance (default: true)
   */
  register<T>(key: string, factory: Factory<T>, singleton: boolean = true): void {
    if (singleton) {
      // Store factory and create on first access
      this.services.set(key, () => {
        if (!this.singletons.has(key)) {
          const instance = factory();
          if (instance instanceof Promise) {
            throw new Error(`Service '${key}' factory returned a Promise. Use registerFactory for async factories.`);
          }
          this.singletons.set(key, instance);
        }
        return this.singletons.get(key);
      });
    } else {
      // Always create new instance
      this.services.set(key, factory);
    }
  }

  /**
   * Register an async factory that can resolve config at runtime
   * @param key - Service identifier
   * @param factory - Async factory function
   * @param configKey - Optional config key to fetch configuration
   */
  registerFactory<T>(
    key: string,
    factory: AsyncFactory<T>,
    configKey?: string
  ): void {
    this.factories.set(key, async () => {
      // Check cache first
      if (this.singletons.has(key)) {
        return this.singletons.get(key);
      }

      // Get config if needed
      let config: any = undefined;
      if (configKey && this.configService) {
        try {
          config = await this.configService.get(configKey, undefined);
        } catch (error) {
          logger.warn(`Config key '${configKey}' not found for service '${key}', using defaults`);
        }
      }

      // Create instance
      const instance = await factory(config);

      // Cache singleton
      this.singletons.set(key, instance);
      return instance;
    });
  }

  /**
   * Resolve a service by key (supports both sync and async)
   * @param key - Service identifier
   * @returns Service instance (Promise if async)
   */
  async resolve<T>(key: string): Promise<T> {
    // Try factory first (async)
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      return await factory();
    }

    // Try regular service (sync or async)
    if (this.services.has(key)) {
      const factory = this.services.get(key)!;
      const instance = factory();
      if (instance instanceof Promise) {
        return await instance;
      }
      return instance as T;
    }

    throw new Error(`Service '${key}' not found. Make sure it's registered.`);
  }

  /**
   * Resolve a service synchronously (only for sync services)
   * @param key - Service identifier
   * @returns Service instance
   */
  resolveSync<T>(key: string): T {
    if (this.factories.has(key)) {
      throw new Error(`Service '${key}' is an async factory. Use resolve() instead.`);
    }

    if (this.services.has(key)) {
      const factory = this.services.get(key)!;
      const instance = factory();
      if (instance instanceof Promise) {
        throw new Error(`Service '${key}' factory returned a Promise. Use resolve() instead.`);
      }
      return instance as T;
    }

    throw new Error(`Service '${key}' not found. Make sure it's registered.`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear singleton cache for a specific service
   */
  clearSingleton(key: string): void {
    this.singletons.delete(key);
    logger.log(`🔄 Singleton cache cleared for service: ${key}`);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    logger.log('🔄 All singleton caches cleared');
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): string[] {
    const serviceKeys = Array.from(this.services.keys());
    const factoryKeys = Array.from(this.factories.keys());
    const allKeys = [...serviceKeys, ...factoryKeys];
    return Array.from(new Set(allKeys));
  }
}

// Export singleton instance
export const container = new DIContainer();

