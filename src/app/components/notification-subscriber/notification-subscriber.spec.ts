import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationSubscriber } from './notification-subscriber';

describe('NotificationSubscriber', () => {
  let component: NotificationSubscriber;
  let fixture: ComponentFixture<NotificationSubscriber>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationSubscriber],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationSubscriber);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
