/**
 * Forecasting Service
 *
 * Uses GPT-4 to generate predictive forecasts for business metrics
 * Provides trend analysis and recommendations
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

export interface ForecastData {
  metric: string;
  horizon: number; // Days to forecast
  generatedAt: Date;
  predictions: Array<{
    date: string;
    predicted: number;
    confidence: number; // 0-1
    lowerBound: number;
    upperBound: number;
  }>;
  insights: string[];
  methodology: string;
}

export class ForecastingService {
  private openai: OpenAI;
  private forecasts: Map<string, ForecastData> = new Map();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async initialize(): Promise<void> {
    console.log('[ForecastingService] Initialized');
  }

  async shutdown(): Promise<void> {
    console.log('[ForecastingService] Shutting down');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      forecastCount: this.forecasts.size,
      availableMetrics: Array.from(this.forecasts.keys()),
    };
  }

  /**
   * Generate forecast for a specific metric
   */
  async generateForecast(metric: string, horizon: number = 30): Promise<ForecastData> {
    console.log(`[ForecastingService] Generating ${horizon}-day forecast for ${metric}`);

    // Get historical data
    const historicalData = await this.getHistoricalData(metric);

    // Generate forecast using GPT
    const forecast = await this.generateGPTForecast(metric, historicalData, horizon);

    // Cache the forecast
    this.forecasts.set(metric, forecast);

    return forecast;
  }

  /**
   * Get all cached forecasts
   */
  async getAllForecasts(): Promise<Record<string, ForecastData>> {
    const result: Record<string, ForecastData> = {};
    this.forecasts.forEach((forecast, metric) => {
      result[metric] = forecast;
    });
    return result;
  }

  /**
   * Update all cached forecasts
   */
  async updateAllForecasts(): Promise<void> {
    const metrics = ['revenue', 'users', 'usage'];

    for (const metric of metrics) {
      try {
        await this.generateForecast(metric, 30);
      } catch (error) {
        console.error(`[ForecastingService] Failed to update forecast for ${metric}:`, error);
      }
    }
  }

  /**
   * Get historical data for a metric
   */
  private async getHistoricalData(metric: string): Promise<Array<{ date: Date; value: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Last 90 days

    switch (metric) {
      case 'revenue':
        const revenueMetrics = await prisma.revenueMetric.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

        return revenueMetrics.map((m: { date: Date; totalRevenue: number }) => ({
          date: m.date,
          value: m.totalRevenue,
        }));

      case 'users':
        const userMetrics = await prisma.revenueMetric.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

        return userMetrics.map((m: { date: Date; activeUsers: number }) => ({
          date: m.date,
          value: m.activeUsers,
        }));

      case 'usage':
        // Aggregate usage events by day
        const usageEvents = await prisma.usageEvent.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: {
            id: true,
          },
        });

        return usageEvents.map((e: { createdAt: Date; _count: { id: number } }) => ({
          date: e.createdAt,
          value: e._count.id,
        }));

      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }

  /**
   * Generate forecast using GPT-4
   */
  private async generateGPTForecast(
    metric: string,
    historicalData: Array<{ date: Date; value: number }>,
    horizon: number
  ): Promise<ForecastData> {
    // Prepare data summary for GPT
    const dataSummary = this.prepareDataSummary(historicalData);

    // Create prompt for GPT
    const prompt = `You are a business analytics AI. Analyze the following historical ${metric} data and generate a ${horizon}-day forecast.

Historical Data (last ${historicalData.length} days):
${dataSummary}

Please provide:
1. Daily predictions for the next ${horizon} days
2. Confidence levels (0-1) for each prediction
3. Upper and lower bounds for each prediction
4. Key insights and trends observed
5. Recommendations based on the forecast

Format your response as JSON with the following structure:
{
  "predictions": [
    {"day": 1, "predicted": number, "confidence": number, "lowerBound": number, "upperBound": number}
  ],
  "insights": ["insight 1", "insight 2"],
  "methodology": "Brief description of approach"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert business analyst specializing in predictive analytics and forecasting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent predictions
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Convert predictions to the expected format
      const predictions = result.predictions.map((p: { predicted: number; confidence: number; lowerBound: number; upperBound: number }, index: number) => {
        const date = new Date();
        date.setDate(date.getDate() + index + 1);

        return {
          date: date.toISOString().split('T')[0],
          predicted: p.predicted,
          confidence: p.confidence,
          lowerBound: p.lowerBound,
          upperBound: p.upperBound,
        };
      });

      return {
        metric,
        horizon,
        generatedAt: new Date(),
        predictions,
        insights: result.insights || [],
        methodology: result.methodology || 'GPT-4 based time series analysis',
      };
    } catch (error) {
      console.error('[ForecastingService] GPT forecast failed:', error);

      // Fallback to simple linear regression if GPT fails
      return this.generateSimpleForecast(metric, historicalData, horizon);
    }
  }

  /**
   * Prepare data summary for GPT prompt
   */
  private prepareDataSummary(data: Array<{ date: Date; value: number }>): string {
    const recent = data.slice(-14); // Last 14 days
    const lines = recent.map((d) => {
      const dateStr = d.date.toISOString().split('T')[0];
      return `${dateStr}: ${d.value.toFixed(2)}`;
    });

    // Add summary statistics
    const values = data.map((d) => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    lines.push('');
    lines.push(`Average: ${avg.toFixed(2)}`);
    lines.push(`Min: ${min.toFixed(2)}`);
    lines.push(`Max: ${max.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Fallback: Simple linear regression forecast
   */
  private generateSimpleForecast(
    metric: string,
    historicalData: Array<{ date: Date; value: number }>,
    horizon: number
  ): ForecastData {
    // Calculate trend using linear regression
    const n = historicalData.length;
    const values = historicalData.map((d) => d.value);

    const avgValue = values.reduce((a, b) => a + b, 0) / n;
    const trend = (values[n - 1] - values[0]) / n;

    // Generate predictions
    const predictions = Array.from({ length: horizon }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      const predicted = avgValue + trend * (n + i);
      const variance = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / n
      );

      return {
        date: date.toISOString().split('T')[0],
        predicted,
        confidence: 0.6, // Lower confidence for simple model
        lowerBound: predicted - variance,
        upperBound: predicted + variance,
      };
    });

    return {
      metric,
      horizon,
      generatedAt: new Date(),
      predictions,
      insights: ['Forecast generated using simple linear regression (GPT unavailable)'],
      methodology: 'Linear regression with variance-based confidence intervals',
    };
  }
}
