import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type {
  AttributionModel,
  ChannelContributionResult,
} from "@shared/types";

export interface UseChannelContributionsOptions {
  autoLoad?: boolean;
  initialModel?: AttributionModel;
  initialDateRange?: { start: string; end: string };
}

export interface UseChannelContributionsReturn {
  loading: boolean;
  error: string | null;
  data: ChannelContributionResult | null;
  selectedModel: AttributionModel;
  dateRange: { start: string; end: string };
  setSelectedModel: (model: AttributionModel) => void;
  setDateRange: (range: { start: string; end: string }) => void;
  reload: () => Promise<void>;
  clearError: () => void;
}

const defaultDateRange = () => ({
  start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

export function useChannelContributions(
  options: UseChannelContributionsOptions = {}
): UseChannelContributionsReturn {
  const { autoLoad = true, initialModel = "last_click", initialDateRange } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChannelContributionResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<AttributionModel>(initialModel);
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
      const result = await api.getChannelContributions({
        model: selectedModel,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载渠道贡献数据失败";
      setError(message);
      console.error("加载渠道贡献数据失败:", err);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [selectedModel, dateRange]);

  useEffect(() => {
    if (autoLoad) {
      reload();
    }
  }, [autoLoad, reload]);

  return {
    loading,
    error,
    data,
    selectedModel,
    dateRange,
    setSelectedModel,
    setDateRange,
    reload,
    clearError,
  };
}
