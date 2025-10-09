/**
 * WaveProgress Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WaveProgress from '../../app/components/WaveProgress';

const mockData = [
  {
    id: 'wave-1',
    name: 'Wave 1: Foundation',
    status: 'completed',
    completion: 100,
    tasks_completed: 12,
    tasks_total: 12,
    estimated_hours: 40,
    actual_hours: 38,
    remaining_hours: 0,
  },
  {
    id: 'wave-2',
    name: 'Wave 2: Core Features',
    status: 'in_progress',
    completion: 65,
    tasks_completed: 8,
    tasks_total: 12,
    estimated_hours: 60,
    actual_hours: 35,
    remaining_hours: 25,
  },
  {
    id: 'wave-3',
    name: 'Wave 3: Advanced Features',
    status: 'pending',
    completion: 0,
    tasks_completed: 0,
    tasks_total: 15,
    estimated_hours: 80,
    actual_hours: 0,
    remaining_hours: 80,
  },
];

describe('WaveProgress Component', () => {
  it('should render without crashing', () => {
    render(<WaveProgress data={mockData} />);
  });

  it('should return null when data is not provided', () => {
    const { container } = render(<WaveProgress data={null as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when data is empty array', () => {
    const { container } = render(<WaveProgress data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display the Development Progress title', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText('Development Progress')).toBeInTheDocument();
  });

  it('should render all wave items', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText('Wave 1: Foundation')).toBeInTheDocument();
    expect(screen.getByText('Wave 2: Core Features')).toBeInTheDocument();
    expect(screen.getByText('Wave 3: Advanced Features')).toBeInTheDocument();
  });

  it('should display completion percentages', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should display task progress', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText(/12\/12/)).toBeInTheDocument();
    expect(screen.getByText(/8\/12/)).toBeInTheDocument();
    expect(screen.getByText(/0\/15/)).toBeInTheDocument();
  });

  it('should display time estimates', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText(/38h \/ 40h/)).toBeInTheDocument();
    expect(screen.getByText(/35h \/ 60h/)).toBeInTheDocument();
    expect(screen.getByText(/0h \/ 80h/)).toBeInTheDocument();
  });

  it('should display remaining hours', () => {
    render(<WaveProgress data={mockData} />);
    expect(screen.getByText('0h')).toBeInTheDocument();
    expect(screen.getByText('25h')).toBeInTheDocument();
    expect(screen.getByText('80h')).toBeInTheDocument();
  });

  it('should render progress bars', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const progressBars = container.querySelectorAll('.bg-gradient-to-r');
    expect(progressBars.length).toBe(3);
  });

  it('should set correct width for progress bars', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const progressBars = container.querySelectorAll('.bg-gradient-to-r');

    expect(progressBars[0]).toHaveStyle('width: 100%');
    expect(progressBars[1]).toHaveStyle('width: 65%');
    expect(progressBars[2]).toHaveStyle('width: 0%');
  });

  it('should display correct icons for different statuses', () => {
    const { container } = render(<WaveProgress data={mockData} />);

    // Completed icon
    const completedIcons = container.querySelectorAll('.text-jarvis-success');
    expect(completedIcons.length).toBeGreaterThan(0);

    // In progress icon (animated)
    const inProgressIcons = container.querySelectorAll('.animate-pulse');
    expect(inProgressIcons.length).toBeGreaterThan(0);
  });

  it('should handle single wave', () => {
    const singleWave = [mockData[0]];
    render(<WaveProgress data={singleWave} />);
    expect(screen.getByText('Wave 1: Foundation')).toBeInTheDocument();
  });

  it('should display all required labels', () => {
    render(<WaveProgress data={mockData} />);
    const tasksLabels = screen.getAllByText(/Tasks:/);
    const timeLabels = screen.getAllByText(/Time:/);
    const remainingLabels = screen.getAllByText(/Remaining:/);

    expect(tasksLabels.length).toBe(3);
    expect(timeLabels.length).toBe(3);
    expect(remainingLabels.length).toBe(3);
  });
});

describe('getWaveIcon Function', () => {
  it('should render CheckCircle for completed waves', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const checkIcons = container.querySelectorAll('.text-jarvis-success');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('should render Clock with animation for in_progress waves', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const clockIcons = container.querySelectorAll('.text-jarvis-warning.animate-pulse');
    expect(clockIcons.length).toBeGreaterThan(0);
  });

  it('should render Circle for pending waves', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const circleIcons = container.querySelectorAll('.text-gray-500');
    expect(circleIcons.length).toBeGreaterThan(0);
  });
});

describe('Progress Bar Styling', () => {
  it('should have gradient background', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const progressBars = container.querySelectorAll('.bg-gradient-to-r.from-jarvis-primary.to-jarvis-secondary');
    expect(progressBars.length).toBe(3);
  });

  it('should have transition animation', () => {
    const { container } = render(<WaveProgress data={mockData} />);
    const progressBars = container.querySelectorAll('.transition-all.duration-500');
    expect(progressBars.length).toBe(3);
  });
});
