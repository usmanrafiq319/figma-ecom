import { TestBed } from '@angular/core/testing';

import { ChatSignalrService } from './chat-signalr-service';

describe('ChatSignalrService', () => {
  let service: ChatSignalrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatSignalrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
