// ================================
// Service Factories
// ================================
// Barrel export for all service factories

export { BaseServiceFactory, type ServiceFactoryConfig } from './base.factory';
export {
  EmailServiceFactory,
  createEmailService,
  type EmailProvider,
  type EmailParams,
  type EmailResult,
  type BulkEmailParams,
  type BulkEmailResult,
} from './email.factory';

