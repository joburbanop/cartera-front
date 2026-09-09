import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavigationTrailService } from './navigation-trail.service';
import { lotsHub, NAV_TRAIL_STATE_KEY } from '../utils/navigation-trail';

describe('NavigationTrailService', () => {
  let service: NavigationTrailService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(NavigationTrailService);
  });

  it('acepta el rastro de esta sesión y descarta el de una recarga', () => {
    service.capture({
      [NAV_TRAIL_STATE_KEY]: {
        session: service.sessionId,
        hubs: [lotsHub()],
      },
    });
    expect(service.hubs()).toEqual([lotsHub()]);

    service.capture({
      [NAV_TRAIL_STATE_KEY]: {
        session: 'sesion-anterior',
        hubs: [lotsHub()],
      },
    });
    expect(service.hubs()).toBeNull();
  });
});
