import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Quantity } from './quantity';

describe('Quantity', () => {
  let component: Quantity;
  let fixture: ComponentFixture<Quantity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quantity],
    }).compileComponents();

    fixture = TestBed.createComponent(Quantity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
