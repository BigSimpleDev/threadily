import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AdService } from './services/ad.service';
import { PurchaseService } from './services/purchase.service';
import { EnergyService } from './services/energy.service';

describe('AppComponent', () => {
  let adInit: jasmine.Spy;
  let purchaseConfigure: jasmine.Spy;
  let energyInit: jasmine.Spy;

  beforeEach(async () => {
    adInit = jasmine.createSpy('init').and.resolveTo(undefined);
    purchaseConfigure = jasmine.createSpy('configure').and.resolveTo(undefined);
    energyInit = jasmine.createSpy('init');

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: AdService, useValue: { init: adInit, hideLoading: () => {} } },
        { provide: PurchaseService, useValue: { configure: purchaseConfigure } },
        { provide: EnergyService, useValue: { init: energyInit } }
      ]
    })
      .overrideComponent(AppComponent, { set: { template: '<div></div>', imports: [] } })
      .compileComponents();
  });

  it('creates the app and shows the splash first', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.showSplash()).toBeTrue();
  });

  it('bootstraps monetization + energy on construction', () => {
    TestBed.createComponent(AppComponent);
    expect(adInit).toHaveBeenCalled();
    expect(purchaseConfigure).toHaveBeenCalled();
    expect(energyInit).toHaveBeenCalled();
  });

  it('hides the splash once dismissed', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.onSplashDismissed();
    expect(app.showSplash()).toBeFalse();
  });
});
