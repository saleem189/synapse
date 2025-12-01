// ================================
// User Activity Chart Component
// ================================
// Shows online/offline user activity over time

"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

const MAX_DATA_POINTS = 30;

interface ActivityPoint {
  time: string;
  online: number;
  offline: number;
}

export function UserActivityChart() {
  const [dataPoints, setDataPoints] = useState<ActivityPoint[]>([]);
  const [currentOnline, setCurrentOnline] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("connect", () => {
      socket.emit("get-online-users");
    });

    socket.on("online-users", (userIds: string[]) => {
      setCurrentOnline(userIds.length);
    });

    socket.on("user-online", () => {
      setCurrentOnline((prev) => prev + 1);
    });

    socket.on("user-offline", () => {
      setCurrentOnline((prev) => Math.max(0, prev - 1));
    });

    // Initialize data points
    const initialData: ActivityPoint[] = [];
    for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 2000);
      initialData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        online: 0,
        offline: 0,
      });
    }
    setDataPoints(initialData);

    // Update chart every 2 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: ActivityPoint = {
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        online: currentOnline,
        offline: 0, // Could calculate from total users if needed
      };

      setDataPoints((prev) => {
        const newData = [...prev.slice(1), newPoint];
        return newData;
      });
    }, 2000);

    return () => {
      socket.off("connect");
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
      clearInterval(interval);
    };
  }, [socket, isConnected, currentOnline]);

  const maxValue = Math.max(...dataPoints.map((d) => d.online), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {currentOnline}
          </p>
          <p className="text-sm text-surface-500">Currently Online</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Stacked Area Chart */}
      <div className="h-48 flex items-end gap-0.5">
        {dataPoints.map((point, index) => {
          const height = maxValue > 0 ? (point.online / maxValue) * 100 : 0;
          const isLast = index === dataPoints.length - 1;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <div
                className={`w-full rounded-t transition-all duration-300 ${isLast
                    ? "bg-green-500"
                    : point.online > 0
                      ? "bg-green-400/70"
                      : "bg-surface-200 dark:bg-surface-700"
                  }`}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${point.time}: ${point.online} online`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-surface-400">
        <span>{dataPoints[0]?.time}</span>
        <span>{dataPoints[dataPoints.length - 1]?.time}</span>
      </div>
    </div>
  );
}

