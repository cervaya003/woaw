import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NotAuthGuard } from './guards/notauth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: 'inicio',
    loadChildren: () =>
      import('./pages/inicio/inicio.module').then((m) => m.InicioPageModule),
    canActivate: [NotAuthGuard],
    data: { title: 'Iniciar sesión | woaw.com' },
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule),
    data: { title: 'Compra y venta de autos | woaw.com' },
  },
  {
    path: 'nuevos',
    loadChildren: () =>
      import('./pages/coches/nuevos/nuevos.module').then((m) => m.NuevosPageModule),
    data: { title: 'Autos nuevos en Querétaro| woaw.com' },
  },
  {
    path: 'seminuevos',
    loadChildren: () =>
      import('./pages/coches/seminuevos/seminuevos.module').then(
        (m) => m.SeminuevosPageModule
      ),
    data: { title: 'Autos seminuevos en Querétaro | woaw.com' },
  },
  {
    path: 'favoritos',
    loadChildren: () =>
      import('./pages/faviritos/faviritos.module').then(
        (m) => m.FaviritosPageModule
      ),
    canActivate: [AuthGuard],
    data: { title: 'Mis favoritos | woaw.com' },
  },
  {
    path: 'mensajes',
    loadChildren: () =>
      import('./pages/mensajes/mensajes.module').then(
        (m) => m.MensajesPageModule
      ),
    canActivate: [AuthGuard],
    data: { title: 'Mensajes | woaw.com' },
  },
  {
    path: 'ficha/:tipo/:id',
    loadChildren: () =>
      import('./pages/ficha/ficha.module').then((m) => m.FichaPageModule),
    data: { title: 'Detalle del vehículo | woaw.com' },
  },
  {
    path: 'usados',
    loadChildren: () =>
      import('./pages/coches/usados/usados.module').then((m) => m.UsadosPageModule),
    data: { title: 'Autos usados en venta | woaw.com' },
  },
  {
    path: 'mis-autos',
    loadChildren: () =>
      import('./pages/coches/mis-autos/mis-autos.module').then(
        (m) => m.MisAutosPageModule
      ),
    canActivate: [AuthGuard],
    data: { title: 'Mis autos publicados | woaw.com' },
  },
  {
    path: 'update-car/:tipo/:id',
    loadChildren: () =>
      import('./pages/coches/update-car/update-car.module').then(
        (m) => m.UpdateCarPageModule
      ),
    canActivate: [AuthGuard],
    data: { title: 'Editar vehículo | woaw.com' },
  },
  {
    path: 'new-car',
    loadChildren: () =>
      import('./pages/new-car/new-car.module').then((m) => m.NewCarPageModule),
    // canActivate: [AuthGuard],
    data: { title: 'Publicar nuevo vehículo | woaw.com' },
  },
  {
    path: 'mis-motos',
    loadChildren: () => import('./pages/motos/mis-motos/mis-motos.module').then(m => m.MisMotosPageModule),
    data: { title: 'Mis motos publicados | woaw.com' },
  },
  {
    path: 'm-nuevos',
    loadChildren: () => import('./pages/motos/nuevos/nuevos.module').then(m => m.NuevosPageModule),
    data: { title: 'Motos en venta | woaw.com' },
  },
  {
    path: 'm-seminuevos',
    loadChildren: () => import('./pages/motos/seminuevos/seminuevos.module').then(m => m.SeminuevosPageModule)
  },
  {
    path: 'm-usados',
    loadChildren: () => import('./pages/motos/usados/usados.module').then(m => m.UsadosPageModule)
  },
  {
    path: 'arrendamiento',
    loadChildren: () => import('./pages/arrendamiento/arrendamiento.module').then(m => m.ArrendamientoPageModule),
    data: { title: 'Arrendamiento | woaw.com' },
  },
  {
    path: 'search/vehiculos/:termino',
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'lotes',
    loadChildren: () => import('./pages/lotes/lotes.module').then(m => m.LotesPageModule)
  },
  {
    path: 'renta-coches',
    loadChildren: () => import('./pages/renta-coches/renta-coches.module').then(m => m.RentaCochesPageModule),
    data: { title: 'renta | woaw.com' }
  },
  {
    path: 'seguros',
    loadChildren: () => import('./pages/seguros/seguros.module').then(m => m.SegurosPageModule),
    data: { title: 'seguros | woaw.com' }
  },
  {
    path: 'lote-edit/:id',
    loadChildren: () => import('./pages/lote-edit/lote-edit.module').then(m => m.LoteEditPageModule),
    canActivate: [AuthGuard],
    data: { title: 'lote | woaw.com' },
  },
  {
    path: 'lote',
    loadChildren: () => import('./pages/lote/lote.module').then( m => m.LotePageModule),
    data: { title: 'lotes | woaw.com' },
  },




];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
