/**
 * Report Generator
 *
 * Generates Markdown reports from analysis results
 */

import type { AnalysisResult } from './cloud-intelligence.service';

export class ReportGenerator {
  async generateMarkdown(result: AnalysisResult): Promise<string> {
    const sections = [
      this.generateHeader(result),
      this.generateExecutiveSummary(result),
      this.generateVitalitySection(result),
      this.generateTestingSection(result),
      this.generateDeploymentSection(result),
      this.generateModuleHealthSection(result),
      this.generateCorrelationsSection(result),
      this.generateRecommendationsSection(result),
      this.generateAlertsSection(result),
      this.generateFooter(result),
    ];

    return sections.join('\n\n');
  }

  private generateHeader(result: AnalysisResult): string {
    const date = new Date(result.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `# Jarvis Cloud Intelligence Report

**Generated:** ${date}
**Timestamp:** ${result.timestamp}

---`;
  }

  private generateExecutiveSummary(result: AnalysisResult): string {
    const vitalityStatus =
      result.vitalityIndex >= 85 ? '🟢 Excellent' :
      result.vitalityIndex >= 70 ? '🟡 Good' : '🔴 Needs Attention';

    const testStatus =
      result.testResults.passRate >= 95 ? '🟢 Excellent' :
      result.testResults.passRate >= 85 ? '🟡 Good' : '🔴 Needs Attention';

    const deployStatus =
      result.deployments.successRate >= 95 ? '🟢 Excellent' :
      result.deployments.successRate >= 85 ? '🟡 Good' : '🔴 Needs Attention';

    return `## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **System Vitality** | ${result.vitalityIndex}/100 | ${vitalityStatus} |
| **Test Pass Rate** | ${result.testResults.passRate.toFixed(1)}% | ${testStatus} |
| **Deployment Success** | ${result.deployments.successRate.toFixed(1)}% | ${deployStatus} |
| **Modules Analyzed** | ${Object.keys(result.moduleHealth).length} | - |
| **Recommendations** | ${result.recommendations.length} | - |`;
  }

  private generateVitalitySection(result: AnalysisResult): string {
    return `## System Vitality

**Current Index:** ${result.vitalityIndex}/100

${this.generateVitalityBar(result.vitalityIndex)}

**Health Status:**
${result.vitalityIndex >= 85 ? '- ✅ System is operating optimally' :
  result.vitalityIndex >= 70 ? '- ⚠️ System is functional but could be improved' :
  '- 🚨 System health needs immediate attention'}`;
  }

  private generateVitalityBar(vitality: number): string {
    const filled = Math.floor(vitality / 5);
    const empty = 20 - filled;
    return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` ${vitality}%`;
  }

  private generateTestingSection(result: AnalysisResult): string {
    let section = `## Testing Analysis

**Test Execution:**
- Total Tests: ${result.testResults.totalTests}
- Passed: ${result.testResults.passed} ✅
- Failed: ${result.testResults.failed} ❌
- Pass Rate: **${result.testResults.passRate.toFixed(1)}%**`;

    if (result.testResults.failurePatterns.length > 0) {
      section += `\n\n**Recurring Failure Patterns:**\n`;
      for (const pattern of result.testResults.failurePatterns.slice(0, 5)) {
        section += `\n- **${pattern.pattern}**\n`;
        section += `  - Frequency: ${pattern.frequency} occurrences\n`;
        section += `  - Severity: ${(pattern as any).severity?.toUpperCase() || 'MEDIUM'}\n`;
        section += `  - Affected Modules: ${pattern.affectedModules.join(', ')}\n`;
      }
    }

    return section;
  }

  private generateDeploymentSection(result: AnalysisResult): string {
    let section = `## Deployment Analysis

**Deployment Statistics:**
- Total Deployments: ${result.deployments.total}
- Successful: ${result.deployments.successful} ✅
- Failed: ${result.deployments.failed} ❌
- Success Rate: **${result.deployments.successRate.toFixed(1)}%**
- Average Duration: ${(result.deployments.avgDuration / 1000).toFixed(1)}s`;

    if (result.deployments.trends.length > 0) {
      section += `\n\n**Trends:**\n`;
      result.deployments.trends.forEach(trend => {
        section += `- ${trend}\n`;
      });
    }

    return section;
  }

  private generateModuleHealthSection(result: AnalysisResult): string {
    if (Object.keys(result.moduleHealth).length === 0) {
      return `## Module Health\n\nNo module health data available.`;
    }

    let section = `## Module Health\n\n`;

    for (const [moduleName, health] of Object.entries(result.moduleHealth)) {
      const statusIcon =
        health.status === 'healthy' ? '🟢' :
        health.status === 'warning' ? '🟡' : '🔴';

      section += `### ${moduleName} ${statusIcon}\n\n`;
      section += `**Score:** ${health.score}/100\n`;
      section += `**Status:** ${health.status.toUpperCase()}\n\n`;

      if (health.issues.length > 0) {
        section += `**Issues:**\n`;
        health.issues.forEach(issue => {
          section += `- ⚠️ ${issue}\n`;
        });
        section += `\n`;
      }

      if (health.recommendations.length > 0) {
        section += `**Recommendations:**\n`;
        health.recommendations.forEach(rec => {
          section += `- 💡 ${rec}\n`;
        });
        section += `\n`;
      }
    }

    return section;
  }

  private generateCorrelationsSection(result: AnalysisResult): string {
    if (result.correlations.length === 0) {
      return `## Correlations\n\nNo significant correlations detected.`;
    }

    let section = `## Correlations\n\n`;

    for (const corr of result.correlations) {
      const strength = Math.abs(corr.correlation);
      const icon = strength > 0.7 ? '🔥' : strength > 0.4 ? '📊' : '📈';

      section += `${icon} **${corr.insight}**\n`;
      section += `- ${corr.metric1} ↔ ${corr.metric2}\n`;
      section += `- Correlation: ${(corr.correlation * 100).toFixed(0)}%\n\n`;
    }

    return section;
  }

  private generateRecommendationsSection(result: AnalysisResult): string {
    if (result.recommendations.length === 0) {
      return `## Recommendations\n\n✅ No actionable recommendations at this time.`;
    }

    let section = `## Recommendations\n\n`;

    const highPriority = result.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = result.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = result.recommendations.filter(r => r.priority === 'low');

    if (highPriority.length > 0) {
      section += `### 🔴 High Priority\n\n`;
      highPriority.forEach(rec => {
        section += `#### ${rec.title}\n`;
        section += `${rec.description}\n\n`;
        section += `- **Category:** ${rec.category}\n`;
        section += `- **Impact:** ${rec.estimatedImpact}\n`;
        section += `- **Action Required:** ${rec.actionRequired ? 'Yes' : 'No'}\n\n`;
      });
    }

    if (mediumPriority.length > 0) {
      section += `### 🟡 Medium Priority\n\n`;
      mediumPriority.forEach(rec => {
        section += `#### ${rec.title}\n`;
        section += `${rec.description}\n\n`;
      });
    }

    if (lowPriority.length > 0) {
      section += `### 🟢 Low Priority\n\n`;
      lowPriority.forEach(rec => {
        section += `- ${rec.title}: ${rec.description}\n`;
      });
    }

    return section;
  }

  private generateAlertsSection(result: AnalysisResult): string {
    if (result.alertsSent.length === 0) {
      return `## Alerts\n\n✅ No alerts triggered.`;
    }

    let section = `## Alerts\n\n`;
    section += `🚨 **${result.alertsSent.length} alert(s) sent:**\n\n`;
    result.alertsSent.forEach(alert => {
      section += `- ${alert}\n`;
    });

    return section;
  }

  private generateFooter(result: AnalysisResult): string {
    return `---

**Strategic Goals:** ${result.goalsUpdated ? '✅ Updated' : 'Not modified'}

*Report generated by Jarvis Cloud Intelligence Service*`;
  }
}
