/**
 * Structural stand-ins for browser types we only touch narrowly. Keeping them
 * structural avoids coupling app code to a specific browser-typing flavor.
 */

export interface PortLike {
  postMessage(message: unknown): void;
  onMessage: {
    addListener(listener: (message: unknown) => void): void;
  };
  onDisconnect: {
    addListener(listener: () => void): void;
  };
}

export interface SenderLike {
  tab?: { id?: number };
}

export type StorageChangeMap = Record<string, { newValue?: unknown; oldValue?: unknown }>;
