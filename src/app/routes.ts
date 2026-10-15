import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
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
    path: 'collection',
    loadComponent: () => import('./collection/collection.component').then(m => m.CollectionComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '**', redirectTo: '' }
];
