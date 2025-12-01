// ================================
// Custom Hooks Exports
// ================================

export { useOnlineUsers } from './use-online-users';
export type { UseOnlineUsersOptions, UseOnlineUsersReturn } from './use-online-users';

export { useSocket } from './use-socket';
export type { UseSocketOptions, UseSocketReturn } from './use-socket';

export { useApi, useApiPost, useApiPatch, useApiDelete } from './use-api';
export { useQueryApi, useMutationApi, useOptimisticMutation } from './use-react-query';
export type { UseApiOptions, UseApiReturn } from './use-api';

export { useTyping } from './use-typing';
export type { UseTypingOptions, UseTypingReturn } from './use-typing';

export { useFileUpload } from './use-file-upload';
export type { UseFileUploadOptions, UseFileUploadReturn, FileUploadResult } from './use-file-upload';

export { useMessageOperations } from './use-message-operations';
export type { UseMessageOperationsOptions, UseMessageOperationsReturn } from './use-message-operations';

export { useOfflineQueue } from './use-offline-queue';
export type { QueuedAction, UseOfflineQueueOptions, UseOfflineQueueReturn } from './use-offline-queue';

export { useNetworkStatus } from './use-network-status';
export type { NetworkStatus, ConnectionSpeed, UseNetworkStatusOptions, UseNetworkStatusReturn } from './use-network-status';

