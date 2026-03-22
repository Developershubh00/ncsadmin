/**
 * ConnectionStatusBadge
 *
 * Renders a small inline badge showing real-time connection status
 * (connected / connecting / reconnecting / disconnected).
 *
 * Also renders a fixed toast notification whenever the connection
 * state changes so operators are alerted even if they are not looking
 * at the badge.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../types/types';

interface ConnectionStatusBadgeProps {
    status: ConnectionStatus;
    /** Extra CSS classes to apply to the badge wrapper */
    className?: string;
}

const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ status, className = '' }) => {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
    const prevStatusRef = useRef<ConnectionStatus>(status);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fire a toast whenever connection status transitions to a notable state
    useEffect(() => {
        if (prevStatusRef.current === status) return;
        const prev = prevStatusRef.current;
        prevStatusRef.current = status;

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

        if (status === 'connected' && (prev === 'reconnecting' || prev === 'disconnected')) {
            setToast({ message: 'Real-time connection restored.', type: 'success' });
        } else if (status === 'reconnecting') {
            setToast({ message: 'Real-time connection lost – reconnecting…', type: 'warning' });
        } else if (status === 'disconnected') {
            setToast({ message: 'Real-time connection failed. Please refresh the page.', type: 'error' });
        } else {
            // 'connecting' on first mount – no toast needed
            return;
        }

        toastTimerRef.current = setTimeout(() => setToast(null), 5000);
    }, [status]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    // ── Badge ─────────────────────────────────────────────────────────────────
    const badge = (() => {
        switch (status) {
            case 'connected':
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
                        <Wifi size={11} />
                        Live
                    </span>
                );
            case 'reconnecting':
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse ${className}`}>
                        <RefreshCw size={11} className="animate-spin" />
                        Reconnecting
                    </span>
                );
            case 'disconnected':
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ${className}`}>
                        <WifiOff size={11} />
                        Offline
                    </span>
                );
            default: // 'connecting'
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ${className}`}>
                        <RefreshCw size={11} className="animate-spin" />
                        Connecting
                    </span>
                );
        }
    })();

    // ── Toast colour map ──────────────────────────────────────────────────────
    const toastColors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800',
    };
    const toastIcon = {
        success: <Wifi size={15} />,
        warning: <RefreshCw size={15} className="animate-spin" />,
        error: <WifiOff size={15} />,
    };

    return (
        <>
            {badge}

            {toast && (
                <div
                    className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium pointer-events-none select-none transition-all duration-300 ${toastColors[toast.type]}`}
                >
                    {toastIcon[toast.type]}
                    {toast.message}
                </div>
            )}
        </>
    );
};

export default ConnectionStatusBadge;
