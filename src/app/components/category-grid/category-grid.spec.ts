import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryGrid } from './category-grid';

describe('CategoryGrid', () => {
  let component: CategoryGrid;
  let fixture: ComponentFixture<CategoryGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
