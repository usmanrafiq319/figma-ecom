import { Component } from '@angular/core';
import { Hero } from '../components/hero/hero';
import { ProductGrid } from '../components/product-grid/product-grid';
import { Divider } from '../components/divider/divider';
import { CategoryGrid } from '../components/category-grid/category-grid';
import { NotificationSubscriber } from '../components/notification-subscriber/notification-subscriber';

@Component({
  selector: 'app-home',
  imports: [Hero, ProductGrid, Divider, CategoryGrid, NotificationSubscriber],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
