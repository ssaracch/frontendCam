import { Component, OnInit } from '@angular/core';
import { AlertsHistory, AlertsHistoryService } from '../../services/alert-history.service';

@Component({
  selector: 'app-alerts',
  standalone: false,
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css']
})
export class AlertsComponent implements OnInit {
  alerts: AlertsHistory[] = [];
  filteredAlerts: AlertsHistory[] = [];
  searchTerm = '';
  selectedSeverity = 'all';
  selectedAlert: AlertsHistory | null = null;
  page = 1;
  pageSize = 10;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Severity mapping based on alert types
  private severityMap: { [key: string]: string } = {
    'motion': 'Low',
    'intrusion': 'High',
    'offline': 'High',
    'tampering': 'High',
    'sound': 'Medium',
    'fire': 'High',
    'smoke': 'High',
    'default': 'Medium'
  };

  constructor(private alertsService: AlertsHistoryService) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.alertsService.getAlertsHistory().subscribe({
      next: (data) => {
        this.alerts = data;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
      }
    });
  }

  refreshData(): void {
    this.loadAlerts();
  }

  // Apply search and severity filters
  applyFilters(): void {
    let filtered = [...this.alerts];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.camera.nomCamera.toLowerCase().includes(term) ||
        alert.alert.type.toLowerCase().includes(term) ||
        alert.camera.location.toLowerCase().includes(term) ||
        alert.user.nom_User.toLowerCase().includes(term)
      );
    }

    // Apply severity filter
    if (this.selectedSeverity !== 'all') {
      filtered = filtered.filter(alert => 
        this.getSeverity(alert.alert.type) === this.selectedSeverity
      );
    }

    this.filteredAlerts = filtered;
    this.page = 1; // Reset to first page when filters change
  }

  // Get severity level for an alert type
  getSeverity(alertType: string): string {
    return this.severityMap[alertType.toLowerCase()] || this.severityMap['default'];
  }

  // Count alerts by severity
  countBySeverity(severity: string): number {
    return this.alerts.filter(alert => 
      this.getSeverity(alert.alert.type) === severity
    ).length;
  }

  filterBySeverity(): void {
    this.applyFilters();
  }

  // Get paginated items
  pagedItems(): AlertsHistory[] {
    if (this.sortColumn) {
      this.filteredAlerts = [...this.filteredAlerts].sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (this.sortColumn) {
          case 'userName':
            aVal = a.user.nom_User;
            bVal = b.user.nom_User;
            break;
          case 'cameraName':
            aVal = a.camera.nomCamera;
            bVal = b.camera.nomCamera;
            break;
          case 'location':
            aVal = a.camera.location;
            bVal = b.camera.location;
            break;
          case 'alertType':
            aVal = a.alert.type;
            bVal = b.alert.type;
            break;
          case 'alertDate':
            aVal = new Date(a.start_alert);
            bVal = new Date(b.start_alert);
            break;
          case 'performedAt':
            aVal = new Date(a.performed_at);
            bVal = new Date(b.performed_at);
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const start = (this.page - 1) * this.pageSize;
    return this.filteredAlerts.slice(start, start + this.pageSize);
  }

  // Pagination methods
  totalPages(): number {
    return Math.ceil(this.filteredAlerts.length / this.pageSize) || 1;
  }

  totalPagesArray(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  nextPage(): void {
    if (this.page < this.totalPages()) {
      this.page++;
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.page = pageNumber;
    }
  }

  getStartIndex(): number {
    return (this.page - 1) * this.pageSize;
  }

  getEndIndex(): number {
    const endIndex = this.page * this.pageSize;
    return Math.min(endIndex, this.filteredAlerts.length);
  }

  // Sorting
  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  // Modal methods
  viewDetails(alert: AlertsHistory): void {
    this.selectedAlert = alert;
  }

  closeModal(): void {
    this.selectedAlert = null;
  }

  acknowledge(alert: AlertsHistory): void {
    // Here you would typically call an API to acknowledge the alert
    console.log('Acknowledging alert:', alert);
    // You could add a service method to update the alert status
    // For now, just close the modal if it's open
    if (this.selectedAlert === alert) {
      this.closeModal();
    }
  }

  // Export to CSV
  exportToCSV(): void {
    const headers = ['Utilisateur', 'Caméra', 'Localisation', 'Type d\'Alerte', 'Date début', 'Date d\'exécution'];
    const csvContent = [
      headers.join(','),
      ...this.filteredAlerts.map(alert => [
        alert.user.nom_User,
        alert.camera.nomCamera,
        alert.camera.location,
        alert.alert.type,
        new Date(alert.start_alert).toLocaleString(),
        new Date(alert.performed_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alerts_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Trigger search when user types
  onSearchChange(): void {
    this.applyFilters();
  }

  // Get severity CSS class for styling
  getSeverityClass(alertType: string): string {
    const severity = this.getSeverity(alertType);
    switch (severity) {
      case 'High': return 'danger';
      case 'Medium': return 'avg';
      case 'Low': return 'minor';
      default: return 'avg';
    }
  }
}