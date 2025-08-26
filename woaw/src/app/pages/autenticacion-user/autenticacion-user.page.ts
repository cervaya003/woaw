import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../services/general.service';
import { HttpClient } from '@angular/common/http';

type Pais = {
  nombre: string;
  codigo: string;      // ej. +52
  bandera: string;     // ej. 'mx'
  banderaUrl: string;  // https://flagcdn.com/w40/mx.png
};

@Component({
  selector: 'app-autenticacion-user',
  templateUrl: './autenticacion-user.page.html',
  styleUrls: ['./autenticacion-user.page.scss'],
  standalone: false
})
export class AutenticacionUserPage implements OnInit {
  form!: FormGroup;
  loading = false;
  nextUrl: string | null = null;

  // --- Ladas (modal)
  paises: Pais[] = [];
  mostrarModal = false;
  filtroPais = '';
  ladaSeleccionada: Pais = {
    codigo: '+52',
    bandera: 'mx',
    nombre: 'Mexico',
    banderaUrl: 'https://flagcdn.com/w40/mx.png'
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private general: GeneralService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    // Form siempre inicializado
    this.form = this.fb.group({
      lada: [this.ladaSeleccionada.codigo, [Validators.required, Validators.pattern(/^\+\d{1,4}$/)]],
      numero: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
    });

    // Prefetch de ladas
    this.apiBanderas();

    // Si ya tiene teléfono, saltar
    const raw = localStorage.getItem('user');
    const phone = raw ? this.getTelefono(JSON.parse(raw)) : '';
    this.nextUrl = this.route.snapshot.queryParamMap.get('next');
    if (phone) {
      this.irSiguiente();
    }
  }

  private getTelefono(user: any): string {
    const posibles = [user?.numero, user?.telefono, user?.phone, user?.celular, user?.mobile, user?.tel]
      .filter(v => v != null && v !== '');
    const val = (posibles[0] ?? '').toString().trim();
    const soloDigitos = val.replace(/\D+/g, '');
    return soloDigitos.length >= 7 ? val : '';
  }

  // --- Ladas: cargar desde restcountries -> array ordenado
  apiBanderas() {
    this.http
      .get<any[]>('https://restcountries.com/v3.1/all?fields=idd,flags,name,cca2')
      .subscribe((data) => {
        this.paises = data
          .filter((p) => p?.idd?.root)
          .map((p) => {
            const code2 = String(p.cca2 || '').toLowerCase();
            return {
              nombre: p.name?.common || code2.toUpperCase(),
              codigo: `${p.idd.root}${p.idd.suffixes?.[0] || ''}`,
              bandera: code2,
              banderaUrl: `https://flagcdn.com/w40/${code2}.png`,
            } as Pais;
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
  }

  // Búsqueda sin pipes
  paisesFiltrados(): Pais[] {
    const t = this.filtroPais.trim().toLowerCase();
    if (!t) return this.paises;
    return this.paises.filter(p =>
      p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)
    );
  }

  abrirModalLadas() { this.mostrarModal = true; }
  cerrarModal() { this.mostrarModal = false; }

  seleccionarLada(pais: Pais) {
    this.ladaSeleccionada = { ...pais };
    this.form.patchValue({ lada: pais.codigo });
    this.mostrarModal = false;
  }

  async submit() {
    if (this.form.invalid || this.loading) return;

    const lada = this.ladaSeleccionada.codigo; // usamos la seleccionada
    const numero = this.form.value.numero;

    this.loading = true;
    await this.general.loading('Guardando número…');

    this.general.actualizarTelefono(lada, numero).subscribe({
      next: (res: any) => {
        const full = `${lada}${numero}`; // e.g. +525512345678
        this.general.actualizarUserLocal({ lada, numero, telefono: full, phone: full });

        this.general.loadingDismiss();
        this.loading = false;
        this.general.presentToast('¡Teléfono actualizado!', 'success');
        this.irSiguiente();
      },
      error: (err) => {
        this.general.loadingDismiss();
        this.loading = false;
        const msg = err?.error?.message || 'No se pudo guardar el teléfono';
        this.general.alert('Error', msg, 'danger');
      }
    });
  }

  private irSiguiente() {
    const url = this.nextUrl && this.nextUrl !== '/autenticacion-user' ? this.nextUrl : '/home';
    this.router.navigate([url], { replaceUrl: true });
  }
}
