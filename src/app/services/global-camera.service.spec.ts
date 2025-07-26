import { TestBed } from '@angular/core/testing';

import { GlobalCameraService } from './global-camera.service';

describe('GlobalCameraService', () => {
  let service: GlobalCameraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalCameraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
