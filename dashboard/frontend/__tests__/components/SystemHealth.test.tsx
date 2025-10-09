/**
 * SystemHealth Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SystemHealth from '../../app/components/SystemHealth';

const mockData = {
  overall: 'healthy',
  services: {
    control_plane: 'healthy',
    ai_dawg: 'healthy',
    database: 'degraded',
    cache: 'healthy',
  },
  timestamp: '2025-10-08T12:00:00Z',
};

describe('SystemHealth Component', () => {
  it('should render without crashing', () => {
    render(<SystemHealth data={mockData} />);
  });

  it('should return null when data is not provided', () => {
    const { container } = render(<SystemHealth data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display the System Health title', () => {
    render(<SystemHealth data={mockData} />);
    expect(screen.getByText('System Health')).toBeInTheDocument();
  });

  it('should display overall status', () => {
    render(<SystemHealth data={mockData} />);
    expect(screen.getByText('Overall Status')).toBeInTheDocument();
    expect(screen.getAllByText('healthy')[0]).toBeInTheDocument();
  });

  it('should display service count', () => {
    render(<SystemHealth data={mockData} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
  });

  it('should render all services', () => {
    render(<SystemHealth data={mockData} />);
    expect(screen.getByText('control plane')).toBeInTheDocument();
    expect(screen.getByText('ai dawg')).toBeInTheDocument();
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('cache')).toBeInTheDocument();
  });

  it('should replace underscores with spaces in service names', () => {
    render(<SystemHealth data={mockData} />);
    expect(screen.getByText('control plane')).toBeInTheDocument();
    expect(screen.getByText('ai dawg')).toBeInTheDocument();
  });

  it('should display service statuses', () => {
    render(<SystemHealth data={mockData} />);
    const healthyElements = screen.getAllByText('healthy');
    expect(healthyElements.length).toBeGreaterThan(0);
    expect(screen.getByText('degraded')).toBeInTheDocument();
  });

  it('should apply correct colors for overall status', () => {
    const { container } = render(<SystemHealth data={mockData} />);
    const overallStatusDiv = container.querySelector('.bg-jarvis-success\\/10');
    expect(overallStatusDiv).toBeInTheDocument();
  });

  it('should handle degraded overall status', () => {
    const degradedData = { ...mockData, overall: 'degraded' };
    const { container } = render(<SystemHealth data={degradedData} />);
    expect(screen.getAllByText('degraded')[0]).toBeInTheDocument();
  });

  it('should handle unhealthy overall status', () => {
    const unhealthyData = { ...mockData, overall: 'unhealthy' };
    render(<SystemHealth data={unhealthyData} />);
    expect(screen.getAllByText('unhealthy')[0]).toBeInTheDocument();
  });

  it('should handle unknown status', () => {
    const unknownData = { ...mockData, overall: 'unknown' };
    render(<SystemHealth data={unknownData} />);
    expect(screen.getAllByText('unknown')[0]).toBeInTheDocument();
  });

  it('should display "No services detected" when no services exist', () => {
    const emptyData = { overall: 'unknown', services: {} };
    render(<SystemHealth data={emptyData} />);
    expect(screen.getByText('No services detected')).toBeInTheDocument();
  });

  it('should handle missing services object', () => {
    const dataWithoutServices = { overall: 'healthy' };
    render(<SystemHealth data={dataWithoutServices} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should apply hover effects to service items', () => {
    const { container } = render(<SystemHealth data={mockData} />);
    const serviceItems = container.querySelectorAll('.hover\\:border-gray-600');
    expect(serviceItems.length).toBe(4);
  });
});

describe('getStatusIcon Function', () => {
  it('should render CheckCircle for healthy status', () => {
    const { container } = render(<SystemHealth data={mockData} />);
    const checkIcons = container.querySelectorAll('.text-jarvis-success');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('should render AlertCircle for degraded status', () => {
    const { container } = render(<SystemHealth data={mockData} />);
    const alertIcons = container.querySelectorAll('.text-jarvis-warning');
    expect(alertIcons.length).toBeGreaterThan(0);
  });

  it('should render XCircle for unhealthy status', () => {
    const unhealthyData = {
      overall: 'unhealthy',
      services: { service1: 'unhealthy' },
    };
    const { container } = render(<SystemHealth data={unhealthyData} />);
    const xCircles = container.querySelectorAll('.text-jarvis-danger');
    expect(xCircles.length).toBeGreaterThan(0);
  });
});

describe('getStatusColors Function', () => {
  it('should apply correct colors for healthy status', () => {
    const { container } = render(<SystemHealth data={mockData} />);
    const healthyColors = container.querySelector('.bg-jarvis-success\\/10');
    expect(healthyColors).toBeInTheDocument();
  });

  it('should apply correct colors for degraded status', () => {
    const degradedData = { ...mockData, overall: 'degraded' };
    const { container } = render(<SystemHealth data={degradedData} />);
    const degradedColors = container.querySelector('.bg-jarvis-warning\\/10');
    expect(degradedColors).toBeInTheDocument();
  });

  it('should apply correct colors for unhealthy status', () => {
    const unhealthyData = { ...mockData, overall: 'unhealthy' };
    const { container } = render(<SystemHealth data={unhealthyData} />);
    const unhealthyColors = container.querySelector('.bg-jarvis-danger\\/10');
    expect(unhealthyColors).toBeInTheDocument();
  });

  it('should apply correct colors for unknown status', () => {
    const unknownData = { ...mockData, overall: 'unknown' };
    const { container } = render(<SystemHealth data={unknownData} />);
    const unknownColors = container.querySelector('.bg-gray-500\\/10');
    expect(unknownColors).toBeInTheDocument();
  });
});
