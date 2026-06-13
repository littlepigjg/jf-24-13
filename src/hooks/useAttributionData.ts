import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type {
  AttributionModel,
  AttributionResult,
  AttributionOverview,
  ChannelContributionResult,
  ModelComparisonResult,
  JourneyTimelineResult,
} from "@shared/types";

export interface UseAttributionDataOptions {
  initialModel?: AttributionModel;
}

export interface UseAttributionDataReturn {
  loading: boolean;
  error: string | null;
  overview: AttributionOverview | null;
  attributionResult: AttributionResult | null;
  channelContributions: ChannelContributionResult | null;
  modelComparison: ModelComparisonResult | null;
  journeyTimeline: JourneyTimelineResult | null;
  selectedModel: AttributionModel;
  dateRange: { start: string; end: string };
  setSelectedModel: (model: AttributionModel) => void;
  setDateRange: (range: { start: string; end: string }) => void;
  reloadOverview: () => Promise<void>;
  reloadAttribution: () => Promise<void>;
  reloadChannelContributions: () => Promise<void>;
  reloadModelComparison: () => Promise<void>;
  reloadJourneyTimeline: () => Promise<void>;
  reloadAll: () => Promise<void>;
  clearError: () => void;
}

export function useAttributionData(
  options: UseAttributionDataOptions = {}
): UseAttributionDataReturn {
  const { initialModel = "last_click" } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AttributionOverview | null>(null);
  const [attributionResult, setAttributionResult] = useState<AttributionResult | null>(null);
  const [channelContributions, setChannelContributions] = useState<ChannelContributionResult | null>(null);
  const [modelComparison, setModelComparison] = useState<ModelComparisonResult | null>(null);
  const [journeyTimeline, setJourneyTimeline] = useState<JourneyTimelineResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<AttributionModel>(initialModel);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const inflightRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const reloadOverview = useCallback(async () => {
    try {
      const data = await api.getAttributionOverview();
      setOverview(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载概览数据失败";
      setError(message);
      console.error("加载概览数据失败:", err);
    }
  }, []);

  const reloadAttribution = useCallback(async (model?: AttributionModel, range?: { start: string; end: string }) => {
    const m = model || selectedModel;
    const r = range || dateRange;
    try {
      const data = await api.analyzeAttribution({
        model: m,
        startDate: r.start,
        endDate: r.end,
      });
      setAttributionResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载归因数据失败";
      setError(message);
      console.error("加载归因数据失败:", err);
    }
  }, [selectedModel, dateRange]);

  const reloadChannelContributions = useCallback(async (model?: AttributionModel, range?: { start: string; end: string }) => {
    const m = model || selectedModel;
    const r = range || dateRange;
    try {
      const data = await api.getChannelContributions({
        model: m,
        startDate: r.start,
        endDate: r.end,
      });
      setChannelContributions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载渠道贡献数据失败";
      setError(message);
      console.error("加载渠道贡献数据失败:", err);
    }
  }, [selectedModel, dateRange]);

  const reloadModelComparison = useCallback(async (range?: { start: string; end: string }) => {
    const r = range || dateRange;
    try {
      const data = await api.getModelComparison({
        startDate: r.start,
        endDate: r.end,
      });
      setModelComparison(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载模型对比数据失败";
      setError(message);
      console.error("加载模型对比数据失败:", err);
    }
  }, [dateRange]);

  const reloadJourneyTimeline = useCallback(async (range?: { start: string; end: string }) => {
    const r = range || dateRange;
    try {
      const data = await api.getJourneyTimeline({
        startDate: r.start,
        endDate: r.end,
      });
      setJourneyTimeline(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载旅程时间线数据失败";
      setError(message);
      console.error("加载旅程时间线数据失败:", err);
    }
  }, [dateRange]);

  const reloadAll = useCallback(async (model?: AttributionModel, range?: { start: string; end: string }) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    setError(null);
    const m = model || selectedModel;
    const r = range || dateRange;
    try {
      const [overviewData, resultData] = await Promise.all([
        api.getAttributionOverview(),
        api.analyzeAttribution({
          model: m,
          startDate: r.start,
          endDate: r.end,
        }),
      ]);
      setOverview(overviewData);
      setAttributionResult(resultData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载数据失败";
      setError(message);
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [selectedModel, dateRange]);

  return {
    loading,
    error,
    overview,
    attributionResult,
    channelContributions,
    modelComparison,
    journeyTimeline,
    selectedModel,
    dateRange,
    setSelectedModel,
    setDateRange,
    reloadOverview,
    reloadAttribution,
    reloadChannelContributions,
    reloadModelComparison,
    reloadJourneyTimeline,
    reloadAll,
    clearError,
  };
}
