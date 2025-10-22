/**
 * FinancialSummary Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import FinancialSummary from '../../app/components/FinancialSummary';

const mockData = {
  mrr: 8450,
  arr: 101400,
  customers: 387,
  revenue_today: 523.40,
  revenue_this_month: 18293.60,
  cac: 127.50,
  ltv: 2847.30,
  burn_rate: 12500,
  runway_months: 18,
};

describe('FinancialSummary Component', () => {
  it('should render without crashing', () => {
    render(<FinancialSummary data={mockData} />);
  });

  it('should return null when data is not provided', () => {
    const { container } = render(<FinancialSummary data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display the Financial Summary title', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
  });

  it('should display MRR correctly', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.getByText('$8,450')).toBeInTheDocument();
  });

  it('should display ARR correctly', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('$101,400')).toBeInTheDocument();
  });

  it('should display Customers count', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('387')).toBeInTheDocument();
  });

  it('should display Revenue Today', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('Revenue Today')).toBeInTheDocument();
    expect(screen.getByText('$523.4')).toBeInTheDocument();
  });

  it('should display CAC', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('CAC')).toBeInTheDocument();
    expect(screen.getByText('$127.5')).toBeInTheDocument();
  });

  it('should display LTV', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('LTV')).toBeInTheDocument();
    expect(screen.getByText('$2847.3')).toBeInTheDocument();
  });

  it('should display Burn Rate', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('Burn Rate')).toBeInTheDocument();
    expect(screen.getByText('$12,500/mo')).toBeInTheDocument();
  });

  it('should display Runway', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('Runway')).toBeInTheDocument();
    expect(screen.getByText('18 months')).toBeInTheDocument();
  });

  it('should format large numbers with commas', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('$101,400')).toBeInTheDocument();
    expect(screen.getByText('$12,500/mo')).toBeInTheDocument();
  });

  it('should handle missing data gracefully', () => {
    const emptyData = {};
    render(<FinancialSummary data={emptyData} />);

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display all metric icons', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should apply correct color classes to metrics', () => {
    const { container } = render(<FinancialSummary data={mockData} />);

    expect(container.querySelector('.text-jarvis-success')).toBeInTheDocument();
    expect(container.querySelector('.text-jarvis-primary')).toBeInTheDocument();
    expect(container.querySelector('.text-jarvis-secondary')).toBeInTheDocument();
  });

  it('should render 4 main metric cards', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const metricCards = container.querySelectorAll('.bg-black\\/30');
    expect(metricCards.length).toBe(4);
  });

  it('should display divider between main and additional metrics', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const divider = container.querySelector('.border-t.border-gray-700');
    expect(divider).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroData = {
      mrr: 0,
      arr: 0,
      customers: 0,
      revenue_today: 0,
      cac: 0,
      ltv: 0,
      burn_rate: 0,
      runway_months: 0,
    };
    render(<FinancialSummary data={zeroData} />);

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0 months')).toBeInTheDocument();
  });

  it('should display decimal values correctly', () => {
    render(<FinancialSummary data={mockData} />);
    expect(screen.getByText('$523.4')).toBeInTheDocument();
    expect(screen.getByText('$127.5')).toBeInTheDocument();
  });
});

describe('MetricRow Component', () => {
  it('should display label and value', () => {
    render(<FinancialSummary data={mockData} />);

    const labels = ['CAC', 'LTV', 'Burn Rate', 'Runway'];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('should apply correct styling', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const metricRows = container.querySelectorAll('.flex.justify-between.items-center.text-sm');
    expect(metricRows.length).toBeGreaterThan(0);
  });

  it('should display gray text for labels', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const grayTexts = container.querySelectorAll('.text-gray-400');
    expect(grayTexts.length).toBeGreaterThan(0);
  });

  it('should display medium font for values', () => {
    const { container } = render(<FinancialSummary data={mockData} />);
    const mediumFonts = container.querySelectorAll('.font-medium');
    expect(mediumFonts.length).toBeGreaterThan(0);
  });
});
