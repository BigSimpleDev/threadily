import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'packs',
    loadComponent: () => import('./packs/packs.component').then(m => m.PacksComponent)
  },
  {
    path: 'pack/:pack',
    loadComponent: () => import('./pack/pack.component').then(m => m.PackComponent)
  },
  {
    path: 'play/:pack/:index',
    loadComponent: () => import('./game/game.component').then(m => m.GameComponent)
  },
  {
    // Today's daily: the same board, in daily mode (free, recorded, shareable).
    path: 'daily',
    data: { daily: true },
    loadComponent: () => import('./game/game.component').then(m => m.GameComponent)
  },
  {
    path: 'collection',
    loadComponent: () => import('./collection/collection.component').then(m => m.CollectionComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '**', redirectTo: '' }
];
