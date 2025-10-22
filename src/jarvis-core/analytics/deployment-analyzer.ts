/**
 * Deployment Analyzer
 *
 * Analyzes deployment success rates and trends
 */

export interface DeploymentAnalysisResult {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  trends: string[];
}

export class DeploymentAnalyzer {
  async analyze(deploymentData: any[]): Promise<DeploymentAnalysisResult> {
    if (!deploymentData || deploymentData.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 100,
        avgDuration: 0,
        trends: ['No deployment data available'],
      };
    }

    let successful = 0;
    let failed = 0;
    let totalDuration = 0;

    for (const deploy of deploymentData) {
      if (deploy.status === 'success' || deploy.success) {
        successful++;
      } else {
        failed++;
      }

      if (deploy.duration) {
        totalDuration += deploy.duration;
      }
    }

    const total = successful + failed;
    const successRate = total > 0 ? (successful / total) * 100 : 100;
    const avgDuration = total > 0 ? totalDuration / total : 0;

    const trends: string[] = [];

    if (successRate >= 95) {
      trends.push('Deployment pipeline is highly reliable');
    } else if (successRate >= 85) {
      trends.push('Deployment success rate could be improved');
    } else {
      trends.push('Critical: Deployment reliability needs immediate attention');
    }

    if (deploymentData.length > 1) {
      const recent = deploymentData.slice(-3);
      const recentSuccess = recent.filter(d => d.status === 'success' || d.success).length;
      const recentRate = (recentSuccess / recent.length) * 100;

      if (recentRate > successRate) {
        trends.push('Recent deployments showing improvement');
      } else if (recentRate < successRate) {
        trends.push('Recent deployments showing degradation');
      }
    }

    return {
      total,
      successful,
      failed,
      successRate,
      avgDuration,
      trends,
    };
  }
}
