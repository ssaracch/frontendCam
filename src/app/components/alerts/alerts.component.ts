import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertsHistory, AlertsHistoryService } from '../../services/alert-history.service';
import { Camera } from '../../models/camera';
import { CameraService } from '../../services/camera.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  standalone: false,
  styleUrls: ['./alerts.component.css']
})
export class AlertsComponent implements OnInit, OnDestroy {

  alerts: AlertsHistory[] = [];
  filteredAlerts: AlertsHistory[] = [];
  unifiedAlerts: any[] = [];
  currentDate: Date = new Date();

  searchTerm: string = '';
  selectedAlertType: string = 'all';
  page: number = 1;
  pageSize: number = 10;
  sortColumn: string = 'start_alert';
  sortDirection: 'asc' | 'desc' = 'desc';

  private refreshSubscription: Subscription = new Subscription();

  constructor(
    private alertsService: AlertsHistoryService,
    private cameraService: CameraService
  ) {}

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 30 seconds to catch camera status changes
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadData(): void {
    // Load ALL alert history (both resolved and unresolved)
    this.alertsService.getAlertsHistory().subscribe({
      next: (alerts) => {
        console.log('Loaded alerts:', alerts); // Debug log
        this.alerts = alerts;
        this.generateUnifiedAlerts();
      },
      error: (error) => console.error('Error loading alerts:', error)
    });
  }

  refreshData(): void {
    this.loadData();
  }

  generateUnifiedAlerts(): void {
    // Convert all alerts to unified format
    const unifiedAlerts = this.alerts.map(alert => {
      console.log('Processing alert:', alert); // Debug log
      
      return {
        // User information from alert.user
        id_User: alert.user?.id_User || '-',
        nom_User: alert.user?.nom_User || '-',
        
        // Camera information from alert.camera
        idCamera: alert.camera?.idCamera || '-',
        nomCamera: alert.camera?.nomCamera || '-',
        location: alert.camera?.location || '-',
        
        // Alert information
        type: alert.alert?.type || '-',
        start_alert: alert.start_alert ? new Date(alert.start_alert) : null,
        performed_at: alert.performed_at ? new Date(alert.performed_at) : null,
        
        // Status indicators
        isResolved: !!alert.performed_at,
        isOngoing: !alert.performed_at
      };
    });

    console.log('Unified alerts:', unifiedAlerts); // Debug log

    // Apply filters
    this.applyFiltersToUnified(unifiedAlerts);
  }

  applyFiltersToUnified(alerts: any[]): void {
    let filtered = [...alerts];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        (alert.nomCamera && alert.nomCamera.toString().toLowerCase().includes(term)) ||
        (alert.type && alert.type.toString().toLowerCase().includes(term)) ||
        (alert.location && alert.location.toString().toLowerCase().includes(term)) ||
        (alert.nom_User && alert.nom_User.toString().toLowerCase().includes(term)) ||
        (alert.id_User && alert.id_User.toString().toLowerCase().includes(term)) ||
        (alert.idCamera && alert.idCamera.toString().toLowerCase().includes(term))
      );
    }

    // Apply alert type filter
    if (this.selectedAlertType !== 'all') {
      filtered = filtered.filter(alert =>
        alert.type && alert.type.toString().toLowerCase() === this.selectedAlertType.toLowerCase()
      );
    }

    // Sort the filtered results
    this.sortUnifiedAlerts(filtered);
    
    // Reset pagination
    this.page = 1;
  }

  sortUnifiedAlerts(alerts: any[]): void {
    alerts.sort((a, b) => {
      let aVal, bVal;

      switch (this.sortColumn) {
        case 'start_alert':
          aVal = a.start_alert ? a.start_alert.getTime() : 0;
          bVal = b.start_alert ? b.start_alert.getTime() : 0;
          break;
        case 'performed_at':
          aVal = a.performed_at ? a.performed_at.getTime() : 0;
          bVal = b.performed_at ? b.performed_at.getTime() : 0;
          break;
        case 'id_User':
          aVal = a.id_User ? a.id_User.toString() : '';
          bVal = b.id_User ? b.id_User.toString() : '';
          break;
        case 'idCamera':
          aVal = a.idCamera ? a.idCamera.toString() : '';
          bVal = b.idCamera ? b.idCamera.toString() : '';
          break;
        case 'location':
          aVal = a.location || '';
          bVal = b.location || '';
          break;
        default:
          aVal = a[this.sortColumn] ? a[this.sortColumn].toString() : '';
          bVal = b[this.sortColumn] ? b[this.sortColumn].toString() : '';
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.unifiedAlerts = alerts;
  }

  filterAlerts(): void {
    this.generateUnifiedAlerts();
  }

  onSearchChange(): void {
    this.generateUnifiedAlerts();
  }

  pagedItems(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.unifiedAlerts.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.ceil(this.unifiedAlerts.length / this.pageSize) || 1;
  }

  totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  prevPage(): void {
    if (this.page > 1) this.page--;
  }

  nextPage(): void {
    if (this.page < this.totalPages()) this.page++;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.page = page;
  }

  getStartIndex(): number {
    return this.unifiedAlerts.length === 0 ? 0 : (this.page - 1) * this.pageSize;
  }

  getEndIndex(): number {
    const end = this.page * this.pageSize;
    return end > this.unifiedAlerts.length ? this.unifiedAlerts.length : end;
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.sortUnifiedAlerts([...this.unifiedAlerts]);
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    
    const statusLower = status.toString().toLowerCase();
    switch (statusLower) {
      case 'offline':
        return 'status-offline';
      case 'flou':
      case 'blurry':
        return 'status-blurry';
      case 'online':
      case 'normal':
        return 'status-online';
      default:
        return 'status-default';
    }
  }

  exportToCSV(): void {
    const headers = ['ID Utilisateur', 'Nom Utilisateur', 'ID Caméra', 'Nom Caméra', 'Localisation', 'Type/Statut', 'Date début', 'Date d\'exécution', 'Statut'];
    const csvRows = [
      headers.join(','),
      ...this.unifiedAlerts.map(entry => [
        `"${entry.id_User ?? '-'}"`,
        `"${entry.nom_User ?? '-'}"`,
        `"${entry.idCamera ?? '-'}"`,
        `"${entry.nomCamera ?? '-'}"`,
        `"${entry.location ?? '-'}"`,
        `"${entry.type ?? '-'}"`,
        entry.start_alert ? `"${entry.start_alert.toLocaleString()}"` : '"-"',
        entry.performed_at ? `"${entry.performed_at.toLocaleString()}"` : '"-"',
        entry.isResolved ? '"Résolu"' : '"En cours"'
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `alerts_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}