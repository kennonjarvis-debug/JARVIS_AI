/**
 * BusinessMetrics Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BusinessMetrics from '../../app/components/BusinessMetrics';

const mockData = {
  music: {
    health: 'healthy',
    metrics: {
      generations_today: 47,
      success_rate: 94.5,
      avg_generation_time: 12.3,
    },
  },
  marketing: {
    health: 'healthy',
    metrics: {
      users_today: 142,
      conversion_rate: 18.7,
      revenue_today: 523.40,
    },
  },
  engagement: {
    health: 'degraded',
    metrics: {
      active_users: 387,
      churn_risk: 4.2,
      satisfaction_score: 4.6,
    },
  },
  automation: {
    health: 'healthy',
    metrics: {
      workflows_executed: 2847,
      test_coverage: 87.3,
      error_rate: 0.8,
    },
  },
  intelligence: {
    health: 'healthy',
    metrics: {
      dashboards: 8,
      reports_generated: 34,
      insights_delivered: 127,
    },
  },
};

describe('BusinessMetrics Component', () => {
  it('should render without crashing', () => {
    render(<BusinessMetrics data={mockData} />);
  });

  it('should return null when data is not provided', () => {
    const { container } = render(<BusinessMetrics data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display the Business Performance title', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Business Performance')).toBeInTheDocument();
  });

  it('should render all 5 business categories', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Music Generation')).toBeInTheDocument();
    expect(screen.getByText('Marketing & Strategy')).toBeInTheDocument();
    expect(screen.getByText('User Engagement')).toBeInTheDocument();
    expect(screen.getByText('Workflow Automation')).toBeInTheDocument();
    expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
  });

  it('should display music generation metrics correctly', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Generations Today')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('94.5%')).toBeInTheDocument();
    expect(screen.getByText('12.3s')).toBeInTheDocument();
  });

  it('should display marketing metrics correctly', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Users Today')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('18.7%')).toBeInTheDocument();
    expect(screen.getByText('$523.4')).toBeInTheDocument();
  });

  it('should display priority badges', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Priority 1')).toBeInTheDocument();
    expect(screen.getByText('Priority 2')).toBeInTheDocument();
    expect(screen.getByText('Priority 3')).toBeInTheDocument();
    expect(screen.getByText('Priority 4')).toBeInTheDocument();
    expect(screen.getByText('Priority 5')).toBeInTheDocument();
  });

  it('should handle missing metrics gracefully', () => {
    const partialData = {
      music: {
        health: 'unknown',
        metrics: {},
      },
    };
    render(<BusinessMetrics data={partialData} />);

    // Should display 0 for missing values
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('should display health status dots', () => {
    const { container } = render(<BusinessMetrics data={mockData} />);
    const statusDots = container.querySelectorAll('.status-dot');
    expect(statusDots.length).toBe(5);
  });

  it('should apply correct status classes', () => {
    const { container } = render(<BusinessMetrics data={mockData} />);
    const healthyDots = container.querySelectorAll('.status-healthy');
    const degradedDots = container.querySelectorAll('.status-degraded');

    expect(healthyDots.length).toBeGreaterThan(0);
    expect(degradedDots.length).toBeGreaterThan(0);
  });

  it('should render all stat labels', () => {
    render(<BusinessMetrics data={mockData} />);
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('should format percentage values correctly', () => {
    render(<BusinessMetrics data={mockData} />);
    const percentages = screen.getAllByText(/\%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('should format currency values correctly', () => {
    render(<BusinessMetrics data={mockData} />);
    const currency = screen.getAllByText(/\$/);
    expect(currency.length).toBeGreaterThan(0);
  });
});

describe('StatusDot Component', () => {
  it('should apply correct class for healthy status', () => {
    const { container } = render(<BusinessMetrics data={mockData} />);
    const healthyDots = container.querySelectorAll('.status-healthy');
    expect(healthyDots.length).toBeGreaterThan(0);
  });

  it('should apply correct class for degraded status', () => {
    const { container } = render(<BusinessMetrics data={mockData} />);
    const degradedDots = container.querySelectorAll('.status-degraded');
    expect(degradedDots.length).toBeGreaterThan(0);
  });

  it('should apply unknown class for invalid status', () => {
    const dataWithUnknown = {
      ...mockData,
      music: { ...mockData.music, health: 'invalid' },
    };
    const { container } = render(<BusinessMetrics data={dataWithUnknown} />);
    const unknownDots = container.querySelectorAll('.status-unknown');
    expect(unknownDots.length).toBeGreaterThan(0);
  });
});
