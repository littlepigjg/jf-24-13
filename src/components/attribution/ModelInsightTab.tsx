import { Sparkles, Trophy, Zap, Lightbulb, RefreshCw, AlertTriangle, Calendar, Filter } from "lucide-react";
import type { AttributionModel, ModelComparisonResult } from "@shared/types";
import { MODEL_INFO, CHART_COLORS } from "./constants";
import { useModelComparison, type UseModelComparisonOptions } from "@/hooks/useModelComparison";

export interface ModelInsightTabProps {
  modelComparison?: ModelComparisonResult | null;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  standalone?: boolean;
  standaloneOptions?: UseModelComparisonOptions;
  showControls?: boolean;
}

function isDataEmpty(data: ModelComparisonResult): boolean {
  return (
    data.summaries.length === 0 &&
    data.modelAgreement === 0
  );
}

export function ModelInsightTab({
  modelComparison: controlledData,
  loading: controlledLoading = false,
  error: controlledError = null,
  onReload: controlledReload,
  standalone = false,
  standaloneOptions,
  showControls = true,
}: ModelInsightTabProps) {
  const standaloneHook = useModelComparison(standalone ? { autoLoad: true, ...standaloneOptions } : { autoLoad: false });

  const data = standalone ? standaloneHook.data : controlledData;
  const loading = standalone ? standaloneHook.loading : controlledLoading;
  const error = standalone ? standaloneHook.error : controlledError;
  const handleReload = standalone ? standaloneHook.reload : controlledReload;
  const dateRange = standalone ? standaloneHook.dateRange : null;
  const setDateRange = standalone ? standaloneHook.setDateRange : null;

  if (loading && !data) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
        加载模型洞察数据中...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <AlertTriangle className="w-8 h-8 text-warning-400 mx-auto mb-3" />
        <p className="mb-2">{error}</p>
        {handleReload && (
          <button
            onClick={handleReload}
            className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            重试
          </button>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <AlertTriangle className="w-8 h-8 text-warning-400 mx-auto mb-3" />
        <p className="mb-2">暂无模型洞察数据</p>
        {handleReload && (
          <button
            onClick={handleReload}
            className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity mt-2"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            刷新数据
          </button>
        )}
      </div>
    );
  }

  const isEmpty = isDataEmpty(data);

  return (
    <div className="space-y-6">
      {standalone && showControls && dateRange && setDateRange && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input py-1.5 px-3 text-sm w-auto"
              />
              <span>至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input py-1.5 px-3 text-sm w-auto"
              />
            </div>
            <button className="btn-ghost">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
          {handleReload && (
            <button onClick={handleReload} className="btn-secondary" title="刷新数据">
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="card p-10 text-center">
          <Sparkles className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">暂无模型对比数据</h3>
          <p className="text-dark-400 text-sm mb-4">
            {data.summaries.length === 0
              ? "当前还没有产生足够的转化数据，至少需要1次转化且涉及多个渠道才能进行多模型对比分析。"
              : "当前数据不足以形成有意义的模型差异分析。"}
          </p>
          {handleReload && (
            <button
              onClick={handleReload}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              重新加载
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">模型一致性</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {isEmpty ? "-" : `${(data.modelAgreement * 100).toFixed(0)}%`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isEmpty && (
              <p className="text-dark-500 text-xs mt-2">
                {data.modelAgreement > 0.8 ? "各模型高度一致" : data.modelAgreement > 0.5 ? "模型间存在一定差异" : "模型间差异显著"}
              </p>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">推荐模型</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {isEmpty ? "-" : MODEL_INFO[data.recommendedModel].name}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-accent-500 flex items-center justify-center shadow-glow-sm">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isEmpty && (
              <p className="text-dark-500 text-xs mt-2">{data.recommendationReason}</p>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">争议渠道数</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {isEmpty ? "-" : data.controversialChannels.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning-500 to-brand-500 flex items-center justify-center shadow-glow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isEmpty && (
              <p className="text-dark-500 text-xs mt-2">
                {data.controversialChannels.length > 0
                  ? `争议渠道: ${data.controversialChannels.join("、")}`
                  : "无争议渠道，各模型结果一致"}
              </p>
            )}
          </div>
        </div>
      </div>

      {data.summaries.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning-400" />
              各渠道模型归因对比
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/40">
                <tr>
                  <th className="table-head text-left">渠道</th>
                  <th className="table-head text-left">共识排名</th>
                  {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => (
                    <th key={model} className="table-head text-right">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: MODEL_INFO[model].color }}
                      />
                      {MODEL_INFO[model].name}
                    </th>
                  ))}
                  <th className="table-head text-right">方差</th>
                </tr>
              </thead>
              <tbody>
                {data.summaries.map((summary) => (
                  <tr key={summary.channel} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[summary.consensusRank - 1] || CHART_COLORS[0] }}
                        />
                        <span className="text-white font-medium">{summary.channel}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-dark-700 text-dark-400">
                        {summary.consensusRank}
                      </span>
                    </td>
                    {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => {
                      const modelData = summary.models[model];
                      return (
                        <td key={model} className="table-cell text-right">
                          <div className="text-white text-sm">¥{modelData.attributedValue.toLocaleString()}</div>
                          <div className="text-xs text-dark-500">{modelData.percentage.toFixed(1)}%</div>
                        </td>
                      );
                    })}
                    <td className="table-cell text-right">
                      <span className={`text-sm font-medium ${
                        summary.varianceScore > 0.5 ? "text-warning-400" : summary.varianceScore > 0.3 ? "text-accent-400" : "text-success-400"
                      }`}>
                        {(summary.varianceScore * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-400" />
          归因模型说明
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(MODEL_INFO) as [AttributionModel, { name: string; description: string; color: string }][]).map(([key, info]) => (
            <div key={key}
              className={`p-4 rounded-xl border transition-colors ${
                data && data.recommendedModel === key
                  ? "bg-brand-500/10 border-brand-500/30"
                  : "bg-dark-800/50 border-dark-700 hover:border-dark-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="text-white font-medium text-sm">{info.name}</span>
                {data && data.recommendedModel === key && (
                  <span className="tag-green text-xs ml-auto flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    推荐
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-xs leading-relaxed">{info.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
