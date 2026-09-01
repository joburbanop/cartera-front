import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type ChartDataset,
  type ChartType,
  type TooltipItem,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
);

export type ChartCardType = 'bar' | 'doughnut';
export type ChartCardFormat = 'currency' | 'count';

export interface ChartCardDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
}

const BADGE_COLORS = ['#047857', '#b45309', '#475569', '#b91c1c'];
const BRAND_COLOR = '#347769';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-card.component.html',
  styleUrl: './chart-card.component.scss',
})
export class ChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() type: ChartCardType = 'bar';
  @Input() title = '';
  @Input() labels: string[] = [];
  @Input() datasets: ChartCardDataset[] = [];
  @Input() format: ChartCardFormat = 'count';

  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.viewReady) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private renderChart(): void {
    const canvas = this.canvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    this.destroyChart();

    const configuration: ChartConfiguration = {
      type: this.type as ChartType,
      data: {
        labels: this.labels,
        datasets: this.buildDatasets(),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: this.type === 'doughnut',
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              color: '#475569',
              font: { family: 'Montserrat, sans-serif', size: 12, weight: 600 },
            },
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (item: TooltipItem<ChartType>) => this.formatTooltip(item),
            },
          },
        },
        scales: this.type === 'bar' ? {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', maxRotation: 0, autoSkip: true },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#64748b',
              callback: (value) => this.formatAxisValue(Number(value)),
            },
          },
        } : undefined,
      },
    };

    this.chart = new Chart(context, configuration);
  }

  private buildDatasets(): ChartDataset[] {
    return this.datasets.map((dataset) => {
      const fallback = this.type === 'doughnut'
        ? this.doughnutColors(dataset.data.length)
        : BRAND_COLOR;

      return {
        label: dataset.label ?? this.title,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor ?? fallback,
        borderWidth: 0,
        borderRadius: this.type === 'bar' ? 6 : 0,
        maxBarThickness: 28,
      };
    });
  }

  private doughnutColors(count: number): string[] {
    const palette = [...BADGE_COLORS, BRAND_COLOR];
    return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
  }

  private formatTooltip(item: TooltipItem<ChartType>): string {
    const datasetLabel = item.dataset.label ? `${item.dataset.label}: ` : '';
    const raw = this.type === 'bar' ? Number(item.parsed.y ?? 0) : Number(item.parsed);

    return `${datasetLabel}${this.formatValue(raw)}`;
  }

  private formatAxisValue(value: number): string {
    if (this.format === 'currency') {
      return this.formatValue(value);
    }

    return new Intl.NumberFormat('es-CO').format(value);
  }

  private formatValue(value: number): string {
    const rounded = Math.round(value);
    const formatted = new Intl.NumberFormat('es-CO').format(rounded);

    return this.format === 'currency' ? `$ ${formatted}` : formatted;
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
