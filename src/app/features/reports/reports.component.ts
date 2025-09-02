import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { OrphanService } from '../../core/services/orphan.service';
import { DonorService } from '../../core/services/donor.service';
import { SponsorshipService } from '../../core/services/sponsorship.service';
import { DonationService } from '../../core/services/donation.service';
import { OrphanListDTO } from '../../core/models/orphan-list.dto';
import { OrphanDetailDTO } from '../../core/models/orphan-detail.dto';
import { Donor } from '../../core/models/donor.model';
import { Sponsorship } from '../../core/models/sponsorship.model';
import { Donation } from '../../core/models/donation.model';

Chart.register(...registerables);

interface ReportStatistics {
  totalOrphans: number;
  totalDonors: number;
  activeSponsorships: number;
  totalDonationAmount: number;
  sponsoredOrphans: number;
  nonSponsoredOrphans: number;
  sponsorshipRate: number;
  monthlyDonations: { [key: string]: number };
  yearlyDonations: { [key: string]: number };
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  statistics = {
    totalOrphans: 0,
    totalDonors: 0,
    activeSponsorships: 0,
    totalDonationAmount: 0,
    sponsoredOrphans: 0,
    nonSponsoredOrphans: 0,
    sponsorshipRate: 0,
    monthlyDonations: {} as { [key: string]: number },
    yearlyDonations: {} as { [key: string]: number }
  };

  currentDate = new Date();
  orphans: OrphanDetailDTO[] = [];
  donors: Donor[] = [];
  sponsorships: Sponsorship[] = [];
  donations: Donation[] = [];

  isLoading = true;
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];

  // Chart instances
  sponsorshipChart: Chart | null = null;
  donationChart: Chart | null = null;

  constructor(
    private orphanService: OrphanService,
    private donorService: DonorService,
    private sponsorshipService: SponsorshipService,
    private donationService: DonationService
  ) {}

  ngOnInit() {
    this.loadAllData();
  }

  ngOnDestroy() {
    if (this.sponsorshipChart) {
      this.sponsorshipChart.destroy();
    }
    if (this.donationChart) {
      this.donationChart.destroy();
    }
  }

  async loadAllData() {
    this.isLoading = true;
    try {
      // Load all data in parallel
      const [orphansData, donorsData, sponsorshipsData, donationsData] = await Promise.all([
        this.orphanService.getAllOrphans().toPromise(),
        this.donorService.getDonors().toPromise(),
        this.sponsorshipService.getAllSponsorships().toPromise(),
        this.donationService.getAllDonations().toPromise()
      ]);

      // Convert OrphanListDTO to OrphanDetailDTO format for compatibility
      this.orphans = (orphansData || []).map((orphan: any) => ({
        ...orphan,
        isSponsored: false // Will be calculated from sponsorships
      }));
      this.donors = donorsData || [];
      this.sponsorships = sponsorshipsData || [];
      this.donations = donationsData || [];

      this.calculateStatistics();
      this.setupCharts();
      
      // Force chart refresh after data is loaded
      setTimeout(() => {
        this.refreshCharts();
      }, 500);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateStatistics() {
    // Basic counts
    this.statistics.totalOrphans = this.orphans.length;
    this.statistics.totalDonors = this.donors.length;

    // Active sponsorships (status is ACTIVE or not CANCELLED)
    this.statistics.activeSponsorships = this.sponsorships.filter(s => 
      s.status !== 'CANCELLED' && s.status !== 'EXPIRED'
    ).length;

    // Calculate sponsorship rate
    this.statistics.sponsorshipRate = this.statistics.totalOrphans > 0 
      ? (this.statistics.sponsoredOrphans / this.statistics.totalOrphans) * 100 
      : 0;

    // Total donation amount
    this.statistics.totalDonationAmount = this.donations.reduce((sum, donation) => 
      sum + (donation.amount || 0), 0
    );

    // Sponsored vs non-sponsored orphans
    const sponsoredOrphanIds = new Set(
      this.sponsorships
        .filter(s => s.status !== 'CANCELLED' && s.status !== 'EXPIRED')
        .map(s => s.orphanId)
    );
    
    this.statistics.sponsoredOrphans = sponsoredOrphanIds.size;
    this.statistics.nonSponsoredOrphans = this.statistics.totalOrphans - this.statistics.sponsoredOrphans;

    // Monthly and yearly donation distributions
    this.calculateDonationDistributions();
  }

  calculateDonationDistributions() {
    this.statistics.monthlyDonations = {};
    this.statistics.yearlyDonations = {};
    const years = new Set<number>();

    this.donations.forEach(donation => {
      if (donation.donationDate) {
        const date = new Date(donation.donationDate);
        const year = date.getFullYear();
        // Force English month names for consistency
        const monthName = date.toLocaleString('en-US', { month: 'long' });
        const monthKey = `${monthName} ${year}`;
        const yearStr = year.toString();

        years.add(year);

        // Monthly distribution - store all months with year
        this.statistics.monthlyDonations[monthKey] = 
          (this.statistics.monthlyDonations[monthKey] || 0) + (donation.amount || 0);

        // Yearly distribution
        this.statistics.yearlyDonations[yearStr] = 
          (this.statistics.yearlyDonations[yearStr] || 0) + (donation.amount || 0);
      }
    });

    this.availableYears = Array.from(years).sort((a, b) => b - a);
    
    // Debug log to check data
    console.log('Monthly donations data:', this.statistics.monthlyDonations);
    console.log('Selected year:', this.selectedYear);
  }

  onYearChange() {
    this.calculateDonationDistributions();
    this.updateDonationChart();
  }

  setupCharts() {
    setTimeout(() => {
      this.createSponsorshipChart();
      this.createDonationChart();
    }, 100);
  }

  refreshCharts() {
    this.createSponsorshipChart();
    this.createDonationChart();
  }

  createSponsorshipChart() {
    const ctx = document.getElementById('sponsorshipChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.sponsorshipChart) {
      this.sponsorshipChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'pie' as ChartType,
      data: {
        labels: ['Sponsored Orphans', 'Non-Sponsored Orphans'],
        datasets: [{
          data: [this.statistics.sponsoredOrphans, this.statistics.nonSponsoredOrphans],
          backgroundColor: ['#28a745', '#dc3545'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Sponsorship Distribution'
          }
        }
      }
    };

    this.sponsorshipChart = new Chart(ctx, config);
  }

  createDonationChart() {
    const ctx = document.getElementById('donationChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.donationChart) {
      this.donationChart.destroy();
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const data = months.map(month => {
      const key = `${month} ${this.selectedYear}`;
      const value = this.statistics.monthlyDonations[key] || 0;
      console.log(`Chart data for ${key}:`, value);
      return value;
    });

    console.log('All monthly donations:', this.statistics.monthlyDonations);
    console.log('Chart data array:', data);
    console.log('Chart data sum:', data.reduce((a, b) => a + b, 0));

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: months,
        datasets: [{
          label: `Donations ${this.selectedYear}`,
          data: data,
          backgroundColor: '#007bff',
          borderColor: '#0056b3',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Monthly Donations Distribution - ${this.selectedYear}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    };

    this.donationChart = new Chart(ctx, config);
  }

  updateDonationChart() {
    if (!this.donationChart) return;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const data = months.map(month => {
      const key = `${month} ${this.selectedYear}`;
      const value = this.statistics.monthlyDonations[key] || 0;
      console.log(`Update chart data for ${key}:`, value);
      return value;
    });

    console.log('Chart update data array:', data);
    this.donationChart.data.datasets[0].data = data;
    this.donationChart.data.datasets[0].label = `Donations ${this.selectedYear}`;
    this.donationChart.options!.plugins!.title!.text = `Monthly Donations Distribution - ${this.selectedYear}`;
    this.donationChart.update();
  }

  exportToPDF() {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Orphan Management System - Reports', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Statistics
    doc.setFontSize(16);
    doc.text('Key Statistics', 20, 50);
    
    doc.setFontSize(12);
    const stats = [
      ['Total Orphans', this.statistics.totalOrphans.toString()],
      ['Total Donors', this.statistics.totalDonors.toString()],
      ['Active Sponsorships', this.statistics.activeSponsorships.toString()],
      ['Total Donations', `$${this.statistics.totalDonationAmount.toLocaleString()}`],
      ['Sponsored Orphans', this.statistics.sponsoredOrphans.toString()],
      ['Non-Sponsored Orphans', this.statistics.nonSponsoredOrphans.toString()]
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: stats,
      theme: 'grid'
    });

    // Monthly donations table
    doc.setFontSize(16);
    doc.text(`Monthly Donations - ${this.selectedYear}`, 20, (doc as any).lastAutoTable.finalY + 20);

    const monthlyData = Object.entries(this.statistics.monthlyDonations)
      .filter(([key]) => key.includes(this.selectedYear.toString()))
      .map(([month, amount]) => [month.replace(` ${this.selectedYear}`, ''), `$${amount.toLocaleString()}`]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Month', 'Amount']],
      body: monthlyData,
      theme: 'grid'
    });

    doc.save('orphan-management-report.pdf');
  }

  exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Statistics sheet
    const statsData = [
      ['Metric', 'Value'],
      ['Total Orphans', this.statistics.totalOrphans],
      ['Total Donors', this.statistics.totalDonors],
      ['Active Sponsorships', this.statistics.activeSponsorships],
      ['Total Donations', this.statistics.totalDonationAmount],
      ['Sponsored Orphans', this.statistics.sponsoredOrphans],
      ['Non-Sponsored Orphans', this.statistics.nonSponsoredOrphans]
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');

    // Monthly donations sheet
    const monthlyData = [['Month', 'Amount']];
    Object.entries(this.statistics.monthlyDonations)
      .filter(([key]) => key.includes(this.selectedYear.toString()))
      .forEach(([month, amount]) => {
        monthlyData.push([month.replace(` ${this.selectedYear}`, ''), amount.toString()]);
      });
    const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlyWs, `Monthly ${this.selectedYear}`);

    // Yearly donations sheet
    const yearlyData = [['Year', 'Amount']];
    Object.entries(this.statistics.yearlyDonations).forEach(([year, amount]) => {
      yearlyData.push([year, amount.toString()]);
    });
    const yearlyWs = XLSX.utils.aoa_to_sheet(yearlyData);
    XLSX.utils.book_append_sheet(wb, yearlyWs, 'Yearly Donations');

    XLSX.writeFile(wb, 'orphan-management-report.xlsx');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
