import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminConversations } from './admin-conversations';

describe('AdminConversations', () => {
  let component: AdminConversations;
  let fixture: ComponentFixture<AdminConversations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminConversations],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminConversations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
