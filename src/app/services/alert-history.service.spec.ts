import { TestBed } from '@angular/core/testing';

import { AlertsHistoryService } from './alert-history.service';

describe('AlertHistoryService', () => {
  let service: AlertsHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertsHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
