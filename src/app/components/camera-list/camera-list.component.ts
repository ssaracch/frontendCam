import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Camera } from '../../models/camera';
import { CameraService } from '../../services/camera.service';
import { Groupe } from '../../models/groupe';  // Assure-toi que le chemin est correct
import { GroupeService } from '../../services/groupe.service';

@Component({
  selector: 'app-camera-list',
  standalone: false,
  templateUrl: './camera-list.component.html',
  styleUrls: ['./camera-list.component.css']
})
export class CameraListComponent implements OnInit {

  statusCounts: Record<'normal' | 'offline' | 'blurry', number> = {
    normal: 0,
    offline: 0,
    blurry: 0
  };

  groups: Groupe[] = [];
  cameras: Camera[] = [];
  filteredCameras: Camera[] = [];
  selectedStatus: string = 'all';
  cameraForm!: FormGroup;
  isEditMode = false;
  currentCamera: Camera | null = null;
  modalRef: NgbModalRef | null = null;
  searchTerm: string = '';

  constructor(
    private cameraService: CameraService,
    private formBuilder: FormBuilder,
    private groupeService: GroupeService,
    private modalService: NgbModal
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCameras();
    this.loadStatusCounts();
    this.loadGroups();
  }

  private initializeForm(): void {
    const connectedUserId = localStorage.getItem('userId') || '';

    this.cameraForm = this.formBuilder.group({
      user: [{ value: connectedUserId, disabled: true }, Validators.required],  // Champ readonly
      nomCamera: ['', Validators.required],
      location: ['', Validators.required],
      ipAdress: ['', Validators.required],
      macAdress: ['', Validators.required],
      statusCamera: ['', Validators.required],
      groupe: ['', Validators.required]
    });
  }

  loadGroups(): void {
    this.groupeService.getAllGroups().subscribe({
      next: data => {
        this.groups = data;
      },
      error: err => console.error('Erreur chargement groupes:', err)
    });
  }

  loadStatusCounts(): void {
    this.cameraService.getStatusCounts().subscribe({
      next: counts => {
        this.statusCounts.normal = counts['normal'] || 0;
        this.statusCounts.offline = counts['offline'] || 0;
        this.statusCounts.blurry = counts['blurry'] || 0;
      },
      error: err => console.error('Erreur récupération des stats', err)
    });
  }

  loadCameras(): void {
    this.cameraService.getAllCameras().subscribe({
      next: data => {
        this.cameras = data;
        this.filterCameras();
      },
      error: err => console.error('Erreur chargement caméras:', err)
    });
  }

  getErrorMessage(field: string): string {
    const control = this.cameraForm.get(field);
    if (control?.hasError('required')) return 'Ce champ est requis.';
    return '';
  }

  filterCameras(): void {
    this.filteredCameras = this.cameras.filter(camera => {
      const matchStatus = this.selectedStatus === 'all' || camera.statusCamera === this.selectedStatus;
      const matchSearch = !this.searchTerm || camera.nomCamera?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  openAddModal(template: TemplateRef<any>): void {
    this.isEditMode = false;
    this.currentCamera = null;
    this.cameraForm.reset();

    // Remettre l'ID utilisateur connecté dans le formulaire désactivé
    const connectedUserId = localStorage.getItem('userId') || '';
    this.cameraForm.patchValue({ user: connectedUserId });
    this.cameraForm.get('user')?.disable();

    this.modalRef = this.modalService.open(template, { size: 'lg' });
  }

  openEditModal(template: TemplateRef<any>, camera: Camera): void {
    this.isEditMode = true;
    this.currentCamera = camera;
    this.cameraForm.patchValue({
      nomCamera: camera.nomCamera,
      location: camera.location,
      ipAdress: camera.ipAdress,
      macAdress: camera.macAdress,
      statusCamera: camera.statusCamera,
      groupe: camera.groupe?.id_Groupe || ''
    });
    // Laisser le champ user désactivé et prérempli avec l'ID connecté
    const connectedUserId = localStorage.getItem('userId') || '';
    this.cameraForm.patchValue({ user: connectedUserId });
    this.cameraForm.get('user')?.disable();

    this.modalRef = this.modalService.open(template, { size: 'lg' });
  }

  saveCamera(): void {
  if (this.cameraForm.invalid) return;

  const formValue = this.cameraForm.getRawValue();
  const userIdFromControl = this.cameraForm.get('user')?.value;

  console.log('User ID being sent:', userIdFromControl); // Debug log

  const cameraToSave: Camera = {
    nomCamera: formValue.nomCamera,
    location: formValue.location,
    ipAdress: formValue.ipAdress,
    macAdress: formValue.macAdress,
    statusCamera: formValue.statusCamera,
    user: { id_User: Number(userIdFromControl) },  // <== Correct: matches Java entity field name
    groupe: { id_Groupe: formValue.groupe }
  };

  console.log('Camera data being sent:', cameraToSave); // Debug log

  const request = this.isEditMode && this.currentCamera?.idCamera
    ? this.cameraService.updateCamera(this.currentCamera.idCamera, cameraToSave)
    : this.cameraService.addCamera(cameraToSave);

  request.subscribe({
    next: () => {
      this.loadCameras();
      this.loadStatusCounts();
      this.cameraForm.reset();

      const connectedUserId = localStorage.getItem('userId') || '';
      this.cameraForm.patchValue({ user: connectedUserId });
      this.cameraForm.get('user')?.disable();

      this.modalRef?.close();
    },
    error: (error) => {
      console.error('Error saving camera:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.error?.message || error.message));
    }
  });
}


  deleteCamera(camera: Camera): void {
    if (!camera.idCamera && camera.idCamera !== 0) {
      alert('Erreur: ID de caméra manquant');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer la caméra "${camera.nomCamera}" ?`)) return;

    this.cameraService.deleteCamera(camera.idCamera).subscribe({
      next: () => {
        alert('Caméra supprimée avec succès');
        this.loadCameras();
        this.loadStatusCounts();
      },
      error: (error) => {
        if (error.status === 409) {
          alert('Impossible de supprimer la caméra: elle est référencée ailleurs.');
        } else if (error.status === 404) {
          alert('Caméra non trouvée.');
        } else if (error.status === 500) {
          alert('Erreur serveur.');
        } else {
          alert(`Erreur : ${error.message || 'Erreur inconnue'}`);
        }
      }
    });
  }

  exportCameras(): void {
    try {
      const dataToExport = this.filteredCameras.map(camera => ({
        ID: camera.idCamera,
        Nom: camera.nomCamera,
        Localisation: camera.location,
        IP: camera.ipAdress,
        MAC: camera.macAdress,
        Statut: camera.statusCamera,
        Utilisateur: camera.user?.nomUser || 'N/A',
        Groupe: camera.groupe?.nom_Groupe || 'N/A'
      }));

      const csv = this.convertToCSV(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cameras_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur export:', error);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}
