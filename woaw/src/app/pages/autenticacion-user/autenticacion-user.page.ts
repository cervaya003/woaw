import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../services/general.service';
import { HttpClient } from '@angular/common/http';

type Pais = {
  nombre: string;
  codigo: string;
  bandera: string;
  banderaUrl: string;
};

interface UsuarioWoaw {
  _id: string;
  nombre?: string;
  apellidos?: string | null;
  email: string;
  rol: 'cliente' | 'agente' | 'inmobiliaria' | string;
  foto?: string | null;
  telefono?: string | null;
}

@Component({
  selector: 'app-autenticacion-user',
  templateUrl: './autenticacion-user.page.html',
  styleUrls: ['./autenticacion-user.page.scss'],
  standalone: false
})
export class AutenticacionUserPage implements OnInit {
  form!: FormGroup;
  nextUrl: string | null = null;

  user: UsuarioWoaw | null = null;

  paises: Pais[] = [];
  mostrarModal = false;
  filtroPais = '';
  ladaSeleccionada: Pais = {
    codigo: '+52',
    bandera: 'mx',
    nombre: 'Mexico',
    banderaUrl: 'https://flagcdn.com/w40/mx.png'
  };

  imgenPrincipal: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private general: GeneralService,
    private http: HttpClient,
    private generalService: GeneralService,
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      lada: [this.ladaSeleccionada.codigo, [Validators.required, Validators.pattern(/^\+\d{1,4}$/)]],
      numero: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
    });

    this.apiBanderas();
    this.cargaimagen();
    const raw = localStorage.getItem('user');
    console.log(raw);
    try {
      this.user = raw ? JSON.parse(raw) as UsuarioWoaw : null;
    } catch {
      this.user = null;
    }

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
    if (this.form.invalid ) return;

    const lada = this.ladaSeleccionada.codigo;
    const numero = this.form.value.numero;

    await this.general.loading('Guardando número…');

    this.general.actualizarTelefono(lada, numero).subscribe({
      next: (res: any) => {
        const full = `${lada}${numero}`;
        this.general.actualizarUserLocal({ lada, numero, telefono: full, phone: full });

        this.general.loadingDismiss();
        // this.general.presentToast('¡Teléfono guradado!', 'success');
        this.general.alert('Teléfono guardado', 'Tu número se guardo correctamente', 'success');
        this.irSiguiente();
      },
      error: (err) => {
        this.general.loadingDismiss();
        const status = err?.status;
        const msg = err?.error?.message || 'No se pudo guardar el teléfono';

        if (status === 404 && msg.includes('Usuario no encontrado')) {
          localStorage.clear();
          this.general.alert('Sesión inválida', 'Tu cuenta no fue encontrada, vuelve a iniciar sesión.', 'danger');
          this.router.navigate(['/inicio']);
          return;
        }

        this.general.alert('Error', msg, 'danger');
      }
    });
  }
  private irSiguiente() {
    const url = this.nextUrl && this.nextUrl !== '/autenticacion-user' ? this.nextUrl : '/home';
    this.router.navigate([url], { replaceUrl: true });
  }
  get displayName(): string {
    if (!this.user) return 'Usuario';
    const nombre = (this.user.nombre || '').trim();
    const apellidos = (this.user.apellidos || '').trim();
    return (nombre + ' ' + apellidos).trim() || this.user.email;
  }
  get iniciales(): string {
    const parts = this.displayName.split(' ').filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
  get fotoPerfil(): string | null {
    const f = this.user?.foto?.trim();
    return f ? f : null;
  }
  async cargaimagen() {
    this.imgenPrincipal = 'assets/autos/arre5.png';
    try {
      await this.generalService.preloadHero(this.imgenPrincipal);
    } catch {
    }
  }
}
