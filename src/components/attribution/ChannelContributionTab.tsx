import { Award, Zap, RefreshCw, AlertTriangle, Calendar, Filter, ChevronDown, CheckCircle2 } from "lucide-react";
import type { ChannelContributionResult, AttributionModel } from "@shared/types";
import { MODEL_INFO, CHART_COLORS } from "./constants";
import { useChannelContributions, type UseChannelContributionsOptions } from "@/hooks/useChannelContributions";
import { useState } from "react";

export interface ChannelContributionTabProps {
  channelContributions?: ChannelContributionResult | null;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onModelChange?: (model: AttributionModel) => void;
  selectedModel?: AttributionModel;
  standalone?: boolean;
  standaloneOptions?: UseChannelContributionsOptions;
  showControls?: boolean;
}

function isDataEmpty(data: ChannelContributionResult): boolean {
  return (
    data.contributions.length === 0 &&
    data.benchmarks.avgContributionScore === 0 &&
    data.benchmarks.avgConversionRate === 0
  );
}

export function ChannelContributionTab({
  channelContributions: controlledData,
  loading: controlledLoading = false,
  error: controlledError = null,
  onReload: controlledReload,
  onModelChange: controlledModelChange,
  selectedModel: controlledModel,
  standalone = false,
  standaloneOptions,
  showControls = true,
}: ChannelContributionTabProps) {
  const standaloneHook = useChannelContributions(standalone ? { autoLoad: true, ...standaloneOptions } : { autoLoad: false });
  const [showModelSelector, setShowModelSelector] = useState(false);

  const data = standalone ? standaloneHook.data : controlledData;
  const loading = standalone ? standaloneHook.loading : controlledLoading;
  const error = standalone ? standaloneHook.error : controlledError;
  const handleReload = standalone ? standaloneHook.reload : controlledReload;
  const selectedModel = standalone ? standaloneHook.selectedModel : controlledModel;
  const setSelectedModel = standalone ? standaloneHook.setSelectedModel : controlledModelChange;
  const dateRange = standalone ? standaloneHook.dateRange : null;
  const setDateRange = standalone ? standaloneHook.setDateRange : null;

  const handleModelChange = (model: AttributionModel) => {
    setShowModelSelector(false);
    if (setSelectedModel) {
      setSelectedModel(model);
    }
  };

  if (loading && !data) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
        加载渠道贡献评估数据中...
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
        <p className="mb-2">暂无渠道贡献数据</p>
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
  const maxScore = Math.max(...data.contributions.map((c) => c.contributionScore), 1);

  return (
    <div className="space-y-6">
      {standalone && showControls && (
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="relative">
            {selectedModel && (
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="btn-primary flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MODEL_INFO[selectedModel].color }}
                />
                {MODEL_INFO[selectedModel].name}
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            {showModelSelector && selectedModel && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {(Object.keys(MODEL_INFO) as AttributionModel[]).map((model) => (
                  <button
                    key={model}
                    onClick={() => handleModelChange(model)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-dark-700/50 transition-colors text-left ${
                      selectedModel === model ? "bg-dark-700/30" : ""
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: MODEL_INFO[model].color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{MODEL_INFO[model].name}</span>
                        {selectedModel === model && (
                          <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-dark-400 mt-1">{MODEL_INFO[model].description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {dateRange && setDateRange && (
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
            )}
            <button className="btn-ghost">
              <Filter className="w-4 h-4" />
              筛选
            </button>
            {handleReload && (
              <button onClick={handleReload} className="btn-secondary" title="刷新数据">
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            )}
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="card p-10 text-center">
          <Award className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">暂无渠道贡献数据</h3>
          <p className="text-dark-400 text-sm mb-4">
            当前 {data.contributions.length === 0 ? "还没有任何渠道数据" : `有 ${data.contributions.length} 个渠道但还没有产生转化`}，
            需要积累更多曝光、扫码和转化数据后才能进行渠道贡献评估。
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
            <p className="text-dark-400 text-sm">平均贡献分</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {isEmpty ? "-" : data.benchmarks.avgContributionScore}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均转化率</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {isEmpty ? "-" : `${(data.benchmarks.avgConversionRate * 100).toFixed(2)}%`}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均归因价值</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {isEmpty ? "-" : `¥${data.benchmarks.avgAttributedValue.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {data.contributions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-400" />
              渠道贡献评估
              <span className="tag-gray ml-2">共 {data.contributions.length} 个渠道</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/40">
                <tr>
                  <th className="table-head text-left">排名</th>
                  <th className="table-head text-left">渠道</th>
                  <th className="table-head text-right">曝光</th>
                  <th className="table-head text-right">扫码</th>
                  <th className="table-head text-right">独立访客</th>
                  <th className="table-head text-right">首次点击</th>
                  <th className="table-head text-right">末次点击</th>
                  <th className="table-head text-right">辅助转化</th>
                  <th className="table-head text-right">归因价值</th>
                  <th className="table-head text-right">转化率</th>
                  <th className="table-head text-right">贡献分</th>
                </tr>
              </thead>
              <tbody>
                {data.contributions.map((ch, i) => (
                  <tr key={ch.channel} className="table-row">
                    <td className="table-cell">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                        i === 0 ? "bg-gradient-to-br from-warning-500 to-brand-500 text-white"
                          : i === 1 ? "bg-gradient-to-br from-dark-400 to-dark-500 text-white"
                          : i === 2 ? "bg-gradient-to-br from-warning-600 to-warning-500 text-white"
                          : "bg-dark-700 text-dark-400"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-white font-medium">{ch.channel}</span>
                      </div>
                    </td>
                    <td className="table-cell text-right text-dark-300">{ch.totalExposures}</td>
                    <td className="table-cell text-right text-dark-300">{ch.totalScans}</td>
                    <td className="table-cell text-right text-dark-300">{ch.uniqueVisitors}</td>
                    <td className="table-cell text-right text-accent-400">{ch.firstClickConversions}</td>
                    <td className="table-cell text-right text-brand-400">{ch.lastClickConversions}</td>
                    <td className="table-cell text-right text-warning-400">{ch.assistedConversions}</td>
                    <td className="table-cell text-right text-brand-400 font-medium">¥{ch.attributedValue.toLocaleString()}</td>
                    <td className="table-cell text-right text-dark-300">{(ch.conversionRate * 100).toFixed(2)}%</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-gradient rounded-full"
                            style={{ width: `${(ch.contributionScore / maxScore) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-medium text-sm w-14 text-right">{ch.contributionScore}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.channelSynergies.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-warning-400" />
            渠道协同效应
            <span className="tag-gray ml-2">{data.channelSynergies.length} 组强协同</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.channelSynergies.slice(0, 9).map((synergy, i) => (
              <div key={i} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-white text-sm font-medium">{synergy.channelA}</span>
                    <span className="text-dark-500">×</span>
                    <span className="text-white text-sm font-medium">{synergy.channelB}</span>
                  </div>
                  <span className="text-warning-400 font-bold">{(synergy.synergyScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>联合转化: {synergy.jointConversions}</span>
                  <span>联合价值: ¥{synergy.jointValue.toLocaleString()}</span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-warning-500 to-brand-500 rounded-full"
                    style={{ width: `${Math.min(synergy.synergyScore * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
