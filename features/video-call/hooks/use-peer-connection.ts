// ================================
// Peer Connection Hook
// ================================
// Hook for managing WebRTC peer connections

"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { SignalData } from 'simple-peer';
import { getWebRTCService, PeerConnectionCallbacks } from '@/lib/services/webrtc.service';
import type { Instance } from 'simple-peer';

export interface UsePeerConnectionOptions {
  peerId: string;
  initiator: boolean;
  stream?: MediaStream;
  onSignal?: (signal: SignalData) => void;
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onConnect?: () => void;
}

export interface UsePeerConnectionReturn {
  peer: Instance | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  signal: (signalData: SignalData) => void;
  addStream: (stream: MediaStream) => void;
  removeStream: (stream: MediaStream) => void;
  replaceStream: (oldStream: MediaStream, newStream: MediaStream) => void;
  destroy: () => void;
}

/**
 * Hook for managing a single peer connection
 */
export function usePeerConnection(options: UsePeerConnectionOptions): UsePeerConnectionReturn {
  const [peer, setPeer] = useState<Instance | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const webrtcService = getWebRTCService();
  const callbacksRef = useRef<PeerConnectionCallbacks>({});

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = {
      onSignal: options.onSignal,
      onStream: options.onStream,
      onError: (err) => {
        setError(err);
        options.onError?.(err);
      },
      onClose: () => {
        setIsConnected(false);
        setIsConnecting(false);
        options.onClose?.();
      },
      onConnect: () => {
        setIsConnected(true);
        setIsConnecting(false);
        options.onConnect?.();
      },
    };
  }, [options.onSignal, options.onStream, options.onError, options.onClose, options.onConnect]);

  // Create peer connection
  useEffect(() => {
    if (!options.peerId) return;

    const peerInstance = webrtcService.createPeer(
      options.peerId,
      {
        initiator: options.initiator,
        stream: options.stream,
        trickle: false,
      },
      callbacksRef.current
    );

    setPeer(peerInstance);
    setIsConnecting(true);

    // Check connection state periodically
    const checkConnection = setInterval(() => {
      const state = webrtcService.getPeerState(options.peerId);
      if (state === 'connected' && !isConnected) {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (state === 'closed' || state === 'disconnected') {
        setIsConnected(false);
        setIsConnecting(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      webrtcService.destroyPeer(options.peerId);
      setPeer(null);
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [options.peerId, options.initiator, webrtcService, isConnected]);

  // Update stream when it changes
  useEffect(() => {
    if (peer && options.stream) {
      webrtcService.addStreamToPeer(options.peerId, options.stream);
    }
  }, [peer, options.stream, options.peerId, webrtcService]);

  /**
   * Signal the peer connection (exchange offer/answer)
   */
  const signal = useCallback(
    (signalData: SignalData) => {
      webrtcService.signalPeer(options.peerId, signalData);
    },
    [options.peerId, webrtcService]
  );

  /**
   * Add stream to peer connection
   */
  const addStream = useCallback(
    (stream: MediaStream) => {
      webrtcService.addStreamToPeer(options.peerId, stream);
    },
    [options.peerId, webrtcService]
  );

  /**
   * Remove stream from peer connection
   */
  const removeStream = useCallback(
    (stream: MediaStream) => {
      webrtcService.removeStreamFromPeer(options.peerId, stream);
    },
    [options.peerId, webrtcService]
  );

  /**
   * Replace stream in peer connection
   */
  const replaceStream = useCallback(
    (oldStream: MediaStream, newStream: MediaStream) => {
      webrtcService.replaceStreamInPeer(options.peerId, oldStream, newStream);
    },
    [options.peerId, webrtcService]
  );

  /**
   * Destroy peer connection
   */
  const destroy = useCallback(() => {
    webrtcService.destroyPeer(options.peerId);
    setPeer(null);
    setIsConnected(false);
    setIsConnecting(false);
  }, [options.peerId, webrtcService]);

  return {
    peer,
    isConnected,
    isConnecting,
    error,
    signal,
    addStream,
    removeStream,
    replaceStream,
    destroy,
  };
}

