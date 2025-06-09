import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Camera } from '../../models/camera';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-camera-list',
  standalone:false,
  templateUrl: './camera-list.component.html',
  styleUrls: ['./camera-list.component.css']
})
export class CameraListComponent implements OnInit {

  statusCounts: Record<'normal' | 'offline' | 'blurry', number> = {
  normal: 0,
  offline: 0,
  blurry: 0
};

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
    private modalService: NgbModal
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCameras();
    this.loadStatusCounts();
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
    this.cameraService.getAllCameras().subscribe(data => {
      this.cameras = data;
      this.filterCameras();
    });
  }

  private initializeForm(): void {
    this.cameraForm = this.formBuilder.group({
      nomCamera: ['', [Validators.required, Validators.minLength(3)]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      ipAdress: ['', [Validators.required, Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      macAdress: ['', [Validators.required, Validators.pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)]],
      statusCamera: ['', Validators.required],
      user: ['', Validators.required],
      groupe: ['', Validators.required]
    });
  }

  getErrorMessage(field: string): string {
    const control = this.cameraForm.get(field);
    if (control?.hasError('required')) return 'Ce champ est requis.';
    if (control?.hasError('minlength')) return 'Trop court.';
    if (control?.hasError('pattern')) return 'Format invalide.';
    return '';
  }

   filterCameras() {
    this.filteredCameras = this.cameras.filter(camera => {
      const matchStatus = this.selectedStatus === 'all' || camera.statusCamera === this.selectedStatus;
      const matchSearch = camera.nomCamera?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  openAddModal(template: TemplateRef<any>) {
    this.isEditMode = false;
    this.cameraForm.reset();
    this.modalRef = this.modalService.open(template, { size: 'lg' });
  }

  openEditModal(template: TemplateRef<any>, camera: Camera) {
    this.isEditMode = true;
    this.currentCamera = camera;
    this.cameraForm.patchValue(camera);
    this.modalRef = this.modalService.open(template, { size: 'lg' });
  }

  saveCamera(): void {
    if (this.cameraForm.invalid) return;
    const formValue = this.cameraForm.value;

    if (this.isEditMode && this.currentCamera) {
        this.cameraService.updateCamera(this.currentCamera.idCamera?.toString() || '', formValue).subscribe(() => {
        this.loadCameras();
        this.modalRef?.close();
      });
    } else {
      this.cameraService.addCamera(formValue).subscribe(() => {
        this.loadCameras();
        this.modalRef?.close();
      });
    }
  }

  deleteCamera(camera: Camera): void {
      this.cameraService.deleteCamera(camera.idCamera?.toString() || '').subscribe(() => {
      this.loadCameras();
    });
  }



}