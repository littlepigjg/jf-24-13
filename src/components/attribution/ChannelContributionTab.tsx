import { Award, Zap } from "lucide-react";
import type { ChannelContributionResult } from "@shared/types";

export interface ChannelContributionTabProps {
  channelContributions: ChannelContributionResult | null;
  loading?: boolean;
}

export function ChannelContributionTab({
  channelContributions,
  loading = false,
}: ChannelContributionTabProps) {
  if (loading && !channelContributions) {
    return (
      <div className="card p-12 text-center text-dark-400">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
        加载渠道贡献评估数据中...
      </div>
    );
  }

  if (!channelContributions) {
    return (
      <div className="card p-12 text-center text-dark-400">
        暂无渠道贡献数据
      </div>
    );
  }

  const maxScore = Math.max(...channelContributions.contributions.map((c) => c.contributionScore), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均贡献分</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {channelContributions.benchmarks.avgContributionScore}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均转化率</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {(channelContributions.benchmarks.avgConversionRate * 100).toFixed(2)}%
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">平均归因价值</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              ¥{channelContributions.benchmarks.avgAttributedValue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-400" />
            渠道贡献评估
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
              {channelContributions.contributions.map((ch, i) => (
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
                  <td className="table-cell text-white font-medium">{ch.channel}</td>
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

      {channelContributions.channelSynergies.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-warning-400" />
            渠道协同效应
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelContributions.channelSynergies.slice(0, 9).map((synergy, i) => (
              <div key={i} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-dark-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
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
                    style={{ width: `${synergy.synergyScore * 100}%` }}
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
