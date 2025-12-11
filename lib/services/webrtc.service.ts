// ================================
// WebRTC Service (Client-Side)
// ================================
// Manages WebRTC peer connections using simple-peer
// This is a client-side service for browser use

"use client";

import Peer, { Instance, SignalData } from 'simple-peer';
import { DEFAULT_WEBRTC_CONFIG } from '@/lib/config/webrtc-config';

export interface PeerConnectionOptions {
  initiator: boolean;
  stream?: MediaStream;
  trickle?: boolean;
}

export interface PeerConnectionCallbacks {
  onSignal?: (signal: SignalData) => void;
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onConnect?: () => void;
  onData?: (data: Uint8Array) => void;
}

/**
 * WebRTC Service
 * Manages peer-to-peer connections using simple-peer
 */
export class WebRTCService {
  private peers: Map<string, Instance> = new Map();

  /**
   * Create a new peer connection
   */
  createPeer(
    peerId: string,
    options: PeerConnectionOptions,
    callbacks?: PeerConnectionCallbacks
  ): Instance {
    // Remove existing peer if any
    this.destroyPeer(peerId);

    const peerOptions: Peer.Options = {
      initiator: options.initiator,
      trickle: options.trickle ?? false,
      config: DEFAULT_WEBRTC_CONFIG,
    };

    const peer = new Peer(peerOptions);

    // Add local stream if provided
    if (options.stream) {
      peer.addStream(options.stream);
    }

    // Set up event handlers
    if (callbacks?.onSignal) {
      peer.on('signal', (signal) => {
        callbacks.onSignal!(signal);
      });
    }

    if (callbacks?.onStream) {
      peer.on('stream', (stream) => {
        callbacks.onStream!(stream);
      });
    }

    if (callbacks?.onError) {
      peer.on('error', (error) => {
        callbacks.onError!(error);
      });
    }

    if (callbacks?.onClose) {
      peer.on('close', () => {
        callbacks.onClose!();
      });
    }

    if (callbacks?.onConnect) {
      peer.on('connect', () => {
        callbacks.onConnect!();
      });
    }

    if (callbacks?.onData) {
      peer.on('data', (data) => {
        callbacks.onData!(data);
      });
    }

    // Store peer
    this.peers.set(peerId, peer);

    return peer;
  }

  /**
   * Get an existing peer connection
   */
  getPeer(peerId: string): Instance | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Signal a peer connection (exchange offer/answer)
   */
  signalPeer(peerId: string, signal: SignalData): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.signal(signal);
    }
  }

  /**
   * Add/update stream to a peer connection
   */
  addStreamToPeer(peerId: string, stream: MediaStream): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      // Remove existing tracks
      // NOTE: Using `any` here because `simple-peer` doesn't expose the internal RTCPeerConnection
      // The `pc` property is internal to the library and not part of the public API
      // This is necessary to access RTCRtpSender for proper stream management
      const senders = (peer as any).pc?.getSenders();
      if (senders) {
        senders.forEach((sender: RTCRtpSender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
      }

      // Add new stream
      peer.addStream(stream);
    }
  }

  /**
   * Remove stream from a peer connection
   */
  removeStreamFromPeer(peerId: string, stream: MediaStream): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      stream.getTracks().forEach((track) => {
        track.stop();
        peer.removeStream(stream);
      });
    }
  }

  /**
   * Replace stream in a peer connection
   */
  replaceStreamInPeer(peerId: string, oldStream: MediaStream, newStream: MediaStream): void {
    this.removeStreamFromPeer(peerId, oldStream);
    this.addStreamToPeer(peerId, newStream);
  }

  /**
   * Destroy a peer connection
   */
  destroyPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        peer.destroy();
      } catch (error) {
        // Log error but don't throw - cleanup should be best-effort
        // Using console.error here as this is a service layer, not a component
        // Logger would require DI which adds complexity to this utility service
        console.error('Error destroying peer:', error);
      }
      this.peers.delete(peerId);
    }
  }

  /**
   * Destroy all peer connections
   */
  destroyAllPeers(): void {
    this.peers.forEach((peer, peerId) => {
      this.destroyPeer(peerId);
    });
  }

  /**
   * Get all active peer IDs
   */
  getActivePeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Check if a peer connection exists
   */
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  /**
   * Get peer connection state
   */
  getPeerState(peerId: string): 'new' | 'connecting' | 'connected' | 'disconnected' | 'closed' | undefined {
    const peer = this.peers.get(peerId);
    if (!peer) return undefined;

    // Access internal connection state
    // NOTE: Using `any` here because `simple-peer` doesn't expose the internal RTCPeerConnection
    // The `pc` property is internal to the library and not part of the public API
    // This is necessary to check the actual WebRTC connection state for better state management
    const pc = (peer as any).pc as RTCPeerConnection;
    if (!pc) return 'new';

    switch (pc.connectionState) {
      case 'new':
        return 'new';
      case 'connecting':
        return 'connecting';
      case 'connected':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'failed':
      case 'closed':
        return 'closed';
      default:
        return 'new';
    }
  }
}

// Singleton instance
let webrtcServiceInstance: WebRTCService | null = null;

/**
 * Get WebRTC service instance (singleton)
 */
export function getWebRTCService(): WebRTCService {
  if (!webrtcServiceInstance) {
    webrtcServiceInstance = new WebRTCService();
  }
  return webrtcServiceInstance;
}

