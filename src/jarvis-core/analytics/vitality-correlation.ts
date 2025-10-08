/**
 * Vitality Correlation Engine
 *
 * Correlates vitality metrics with testing outcomes and performance
 */

export interface Correlation {
  metric1: string;
  metric2: string;
  correlation: number;
  insight: string;
}

export interface VitalityAnalysisResult {
  currentVitality: number;
  correlations: Correlation[];
  predictions: {
    metric: string;
    predictedValue: number;
    confidence: number;
  }[];
}

export class VitalityCorrelation {
  async analyze(
    vitalityData: any[],
    testData: any[],
    performanceData: any[]
  ): Promise<VitalityAnalysisResult> {
    // Extract current vitality
    const currentVitality = this.extractCurrentVitality(vitalityData);

    // Calculate correlations
    const correlations: Correlation[] = [];

    // Correlate vitality with test pass rate
    const testPassRate = this.calculateTestPassRate(testData);
    if (testPassRate !== null) {
      const correlation = this.calculateCorrelation(currentVitality, testPassRate);
      correlations.push({
        metric1: 'vitality_index',
        metric2: 'test_pass_rate',
        correlation,
        insight: this.generateCorrelationInsight('vitality', 'test quality', correlation),
      });
    }

    // Correlate vitality with module performance
    const modulePerformance = this.calculateModulePerformance(performanceData);
    if (modulePerformance !== null) {
      const correlation = this.calculateCorrelation(currentVitality, modulePerformance);
      correlations.push({
        metric1: 'vitality_index',
        metric2: 'module_performance',
        correlation,
        insight: this.generateCorrelationInsight('vitality', 'module performance', correlation),
      });
    }

    return {
      currentVitality,
      correlations,
      predictions: [],
    };
  }

  private extractCurrentVitality(vitalityData: any[]): number {
    if (!vitalityData || vitalityData.length === 0) return 80;

    // Get most recent vitality
    const recent = vitalityData[vitalityData.length - 1];
    return recent?.vitality?.vitalityIndex || recent?.vitalityIndex || 80;
  }

  private calculateTestPassRate(testData: any[]): number | null {
    if (!testData || testData.length === 0) return null;

    const rates = testData
      .filter(t => t.assertions && t.assertions.total > 0)
      .map(t => (t.assertions.passed / t.assertions.total) * 100);

    if (rates.length === 0) return null;

    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }

  private calculateModulePerformance(performanceData: any[]): number | null {
    if (!performanceData || performanceData.length === 0) return null;

    const scores = performanceData
      .filter(p => p.type === 'performance_analysis' && p.data?.overallScore !== undefined)
      .map(p => p.data.overallScore);

    if (scores.length === 0) return null;

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateCorrelation(value1: number, value2: number): number {
    // Simple correlation (would use Pearson in production with time series)
    const normalized1 = value1 / 100;
    const normalized2 = value2 / 100;

    return Math.min(1, Math.max(-1, normalized1 * normalized2));
  }

  private generateCorrelationInsight(metric1: string, metric2: string, correlation: number): string {
    const strength = Math.abs(correlation);
    const direction = correlation > 0 ? 'positive' : 'negative';

    if (strength > 0.7) {
      return `Strong ${direction} correlation between ${metric1} and ${metric2}`;
    } else if (strength > 0.4) {
      return `Moderate ${direction} correlation between ${metric1} and ${metric2}`;
    } else {
      return `Weak correlation between ${metric1} and ${metric2}`;
    }
  }
}
