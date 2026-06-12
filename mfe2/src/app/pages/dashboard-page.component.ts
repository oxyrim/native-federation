import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { chartTheme, upTokens } from '@loan/design-tokens';
import { AnalyticsBridgeService } from '../core/bridge.service';

@Component({
  selector: 'mfe2-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ChartModule, ButtonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent {
  protected readonly bridge = inject(AnalyticsBridgeService);

  protected millions(value: number): string {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  protected readonly sourcesData = computed(() => {
    const s = this.bridge.summary();
    return {
      labels: ['From Desktop Underwriter', 'Imported by User'],
      datasets: [
        {
          data: [s?.fromDesktopUnderwriter ?? 0, s?.importedByUser ?? 0],
          backgroundColor: [upTokens.chart[0], upTokens.chart[1]],
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly statusData = computed(() => {
    const s = this.bridge.summary();
    return {
      labels: ['Ready for Pricing', 'Missing Data', 'Ineligible'],
      datasets: [
        {
          label: 'Loans',
          data: [s?.readyForPricing ?? 0, s?.missingData ?? 0, s?.ineligible ?? 0],
          backgroundColor: [upTokens.statusReady, upTokens.chart[2], upTokens.border],
          borderRadius: 6,
          maxBarThickness: 56,
        },
      ],
    };
  });

  /** chart.js cannot read CSS variables — derive its colors from the
      governed theme channel so charts restyle live on toggle. */
  private readonly chart = computed(() => chartTheme(this.bridge.theme()));

  protected readonly trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Avg. All-in Price',
        data: [100.42, 100.61, 100.38, 100.85, 101.02, 101.18],
        borderColor: upTokens.chart[0],
        backgroundColor: 'rgba(47, 111, 237, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: 'Avg. Base Price',
        data: [99.81, 99.95, 99.7, 100.12, 100.31, 100.44],
        borderColor: upTokens.chart[3],
        backgroundColor: 'transparent',
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  protected readonly doughnutOptions = computed(() => ({
    cutout: '66%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, font: { size: 11 }, color: this.chart().text },
      },
    },
    maintainAspectRatio: false,
  }));

  protected readonly barOptions = computed(() => ({
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: this.chart().text },
        grid: { color: this.chart().grid },
      },
      x: { ticks: { color: this.chart().text }, grid: { display: false } },
    },
    maintainAspectRatio: false,
  }));

  protected readonly lineOptions = computed(() => ({
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, font: { size: 11 }, color: this.chart().text },
      },
    },
    scales: {
      y: { ticks: { color: this.chart().text }, grid: { color: this.chart().grid } },
      x: { ticks: { color: this.chart().text }, grid: { color: this.chart().grid } },
    },
    maintainAspectRatio: false,
  }));

  protected goToPipeline(): void {
    // Governed: MFE2 may not touch the URL — it ASKS the shell to navigate.
    this.bridge.requestNavigation('/pipeline');
  }
}
