/**
 * InstanceMonitor Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InstanceMonitor from '../../app/components/InstanceMonitor';

const mockData = {
  instances: {
    'instance-1': {
      id: 'instance-1',
      role: 'Frontend Developer',
      status: 'active',
      current_task: 'Building dashboard UI',
      branch: 'feature/dashboard',
      last_commit: {
        hash: 'abc123',
        message: 'Add dashboard components',
      },
    },
    'instance-2': {
      id: 'instance-2',
      role: 'Backend Developer',
      status: 'pending',
      current_task: 'API optimization',
      branch: 'feature/api',
      last_commit: {
        hash: 'def456',
        message: 'Optimize endpoints',
      },
    },
  },
  metrics: {
    tasks_completed: 42,
    tasks_in_progress: 3,
    blockers_count: 1,
  },
  blockers: [
    {
      description: 'Waiting for API deployment',
      resolution_eta: '2 hours',
    },
  ],
};

describe('InstanceMonitor Component', () => {
  it('should render without crashing', () => {
    render(<InstanceMonitor data={mockData} />);
  });

  it('should return null when data is not provided', () => {
    const { container } = render(<InstanceMonitor data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display the Claude Instances title', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Claude Instances')).toBeInTheDocument();
  });

  it('should display metrics summary', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Blockers')).toBeInTheDocument();
  });

  it('should display correct metric values', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render all instances', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('instance-1')).toBeInTheDocument();
    expect(screen.getByText('instance-2')).toBeInTheDocument();
  });

  it('should display instance roles', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
  });

  it('should display current tasks', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Building dashboard UI')).toBeInTheDocument();
    expect(screen.getByText('API optimization')).toBeInTheDocument();
  });

  it('should display branch names', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('feature/dashboard')).toBeInTheDocument();
    expect(screen.getByText('feature/api')).toBeInTheDocument();
  });

  it('should display last commit information', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('Add dashboard components')).toBeInTheDocument();
    expect(screen.getByText('def456')).toBeInTheDocument();
    expect(screen.getByText('Optimize endpoints')).toBeInTheDocument();
  });

  it('should display instance status badges', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should display blockers section when blockers exist', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Active Blockers')).toBeInTheDocument();
    expect(screen.getByText('Waiting for API deployment')).toBeInTheDocument();
    expect(screen.getByText('ETA: 2 hours')).toBeInTheDocument();
  });

  it('should not display blockers section when no blockers', () => {
    const dataWithoutBlockers = {
      ...mockData,
      blockers: [],
    };
    render(<InstanceMonitor data={dataWithoutBlockers} />);
    expect(screen.queryByText('Active Blockers')).not.toBeInTheDocument();
  });

  it('should handle empty instances object', () => {
    const dataWithNoInstances = {
      ...mockData,
      instances: {},
    };
    render(<InstanceMonitor data={dataWithNoInstances} />);
    expect(screen.getByText('Claude Instances')).toBeInTheDocument();
  });

  it('should handle missing metrics gracefully', () => {
    const dataWithoutMetrics = {
      instances: mockData.instances,
    };
    render(<InstanceMonitor data={dataWithoutMetrics} />);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('should handle instance without last commit', () => {
    const dataWithoutCommit = {
      instances: {
        'instance-3': {
          id: 'instance-3',
          role: 'Tester',
          status: 'active',
          current_task: 'Running tests',
          branch: 'main',
        },
      },
      metrics: mockData.metrics,
    };
    render(<InstanceMonitor data={dataWithoutCommit} />);
    expect(screen.getByText('instance-3')).toBeInTheDocument();
    expect(screen.getByText('Running tests')).toBeInTheDocument();
  });
});

describe('InstanceStatus Component', () => {
  it('should display correct status for active instances', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should display correct status for pending instances', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should handle unknown status', () => {
    const dataWithUnknownStatus = {
      instances: {
        'instance-unknown': {
          id: 'instance-unknown',
          role: 'Developer',
          status: 'invalid-status',
          current_task: 'Task',
          branch: 'main',
        },
      },
      metrics: mockData.metrics,
    };
    render(<InstanceMonitor data={dataWithUnknownStatus} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('MetricCard Component', () => {
  it('should display metric cards with icons', () => {
    const { container } = render(<InstanceMonitor data={mockData} />);
    const metricCards = container.querySelectorAll('.text-center');
    expect(metricCards.length).toBeGreaterThan(0);
  });

  it('should display correct values in metric cards', () => {
    render(<InstanceMonitor data={mockData} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
