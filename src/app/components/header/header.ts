import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from "../../../../node_modules/@angular/common/types/_common_module-chunk";

@Component({
  selector: 'app-header',
  imports: [FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  isBannerHidden = signal(false);
}
