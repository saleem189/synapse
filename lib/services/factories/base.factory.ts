// ================================
// Base Service Factory
// ================================
// Abstract base class for service factories
// Provides common functionality for runtime service selection

import { ConfigService } from '@/lib/config/config.service';
import { logger } from '@/lib/logger';

export interface ServiceFactoryConfig {
  provider?: string;
  [key: string]: any;
}

/**
 * Base factory class for service factories
 */
export abstract class BaseServiceFactory<T> {
  protected providers = new Map<string, (config: any) => T | Promise<T>>();
  protected defaultProvider: string;

  constructor(defaultProvider: string) {
    this.defaultProvider = defaultProvider;
  }

  /**
   * Register a provider implementation
   */
  register(name: string, factory: (config: any) => T | Promise<T>): void {
    this.providers.set(name, factory);
    logger.log(`✅ Registered ${this.getServiceType()} provider: ${name}`);
  }

  /**
   * Create service instance based on configuration
   */
  async create(config?: ServiceFactoryConfig): Promise<T> {
    const configService = await this.getConfigService();
    
    // Get provider name from config, config service, or environment
    const providerName = config?.provider || 
      await this.getProviderFromConfig(configService) || 
      process.env[this.getEnvVarName()] || 
      this.defaultProvider;

    // Get provider-specific configuration
    const providerConfig = config || 
      await this.getProviderConfig(configService, providerName) || 
      {};

    // Get factory
    const factory = this.providers.get(providerName);
    if (!factory) {
      const available = Array.from(this.providers.keys()).join(', ');
      throw new Error(
        `${this.getServiceType()} provider '${providerName}' not registered. ` +
        `Available providers: ${available}`
      );
    }

    // Create instance
    try {
      const instance = await factory(providerConfig);
      logger.log(`✅ Created ${this.getServiceType()} service with provider: ${providerName}`);
      return instance;
    } catch (error: any) {
      logger.error(`Error creating ${this.getServiceType()} service with provider '${providerName}':`, error);
      throw error;
    }
  }

  /**
   * Get list of registered providers
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  isProviderRegistered(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract getServiceType(): string;
  protected abstract getEnvVarName(): string;
  protected abstract getConfigKey(): string;

  /**
   * Get config service (lazy import to avoid circular dependencies)
   */
  private async getConfigService(): Promise<ConfigService | null> {
    try {
      const { getService } = await import('@/lib/di');
      return getService<ConfigService>('configService');
    } catch (error) {
      logger.warn('ConfigService not available, using defaults');
      return null;
    }
  }

  /**
   * Get provider name from config service
   */
  private async getProviderFromConfig(configService: ConfigService | null): Promise<string | null> {
    if (!configService) return null;
    try {
      return await configService.get<string>(this.getConfigKey(), null);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get provider-specific configuration
   */
  private async getProviderConfig(
    configService: ConfigService | null,
    providerName: string
  ): Promise<any> {
    if (!configService) return {};
    try {
      return await configService.get(`${this.getConfigKey()}.providers.${providerName}`, {});
    } catch (error) {
      return {};
    }
  }
}

