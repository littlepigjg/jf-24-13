import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type {
  JourneyTimelineResult,
} from "@shared/types";

export interface UseJourneyTimelineOptions {
  autoLoad?: boolean;
  initialDateRange?: { start: string; end: string };
}

export interface UseJourneyTimelineReturn {
  loading: boolean;
  error: string | null;
  data: JourneyTimelineResult | null;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  reload: () => Promise<void>;
  clearError: () => void;
}

const defaultDateRange = () => ({
  start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

export function useJourneyTimeline(
  options: UseJourneyTimelineOptions = {}
): UseJourneyTimelineReturn {
  const { autoLoad = true, initialDateRange } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JourneyTimelineResult | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    initialDateRange || defaultDateRange()
  );
  const inflightRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const reload = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getJourneyTimeline({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载旅程时间线数据失败";
      setError(message);
      console.error("加载旅程时间线数据失败:", err);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [dateRange]);

  useEffect(() => {
    if (autoLoad) {
      reload();
    }
  }, [autoLoad, reload]);

  return {
    loading,
    error,
    data,
    dateRange,
    setDateRange,
    reload,
    clearError,
  };
}
