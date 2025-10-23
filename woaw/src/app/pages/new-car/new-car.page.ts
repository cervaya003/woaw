import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";

import { GeneralService } from "../../services/general.service";
import { CarsService } from "../../services/cars.service";
import { MotosService } from "../../services/motos.service";
import { Router } from "@angular/router";
import { MenuController } from "@ionic/angular";
import { CamionesService } from "src/app/services/camiones.service";
// (opcional) si vas a enviar al backend de renta desde aquí:
// import { RentaService } from '../../services/renta.service';

interface Marca {
  key: string;
  nombre: string;
  imageUrl: string;
}

@Component({
  selector: "app-new-car",
  templateUrl: "./new-car.page.html",
  styleUrls: ["./new-car.page.scss"],
  standalone: false,
})
export class NewCarPage implements OnInit {
  // ----- Variables
  seleccion: "auto" | "moto" | "renta" | "lote" | "camion" | null = null;
  mostrarSelecion: string = "";
  mostrarIcono: string = "";
  mostrarCarComponent: boolean = false;

  opcionesBase = [
    {
      tipo: "auto",
      label: "Coches",
      icono: "assets/img/icon-coche.png",
      proximamente: false,
    },
    {
      tipo: "moto",
      label: "Motos",
      icono: "assets/img/icon-moto.png",
      proximamente: false,
    },
    {
      tipo: "camion",
      label: "Camiones",
      icono: "assets/img/icon-camion.png",
      proximamente: false,
    },
    {
      tipo: "renta",
      label: "Renta",
      icono: "assets/img/icon-renta.png",
      proximamente: false,
    },
    {
      tipo: "lote",
      label: "Lote",
      icono: "assets/img/icon-lote.png",
      proximamente: false,
    },
  ];

  opciones: any[] = [];

  listaAnios: number[] = [];
  anioSeleccionado: string = "";
  anioManual: string = "";
  mostrarInputOtroAnio: boolean = false;
  anioValido: boolean = false;
  marcaSeleccionada: string = "";
  modeloSeleccionado: string = "";
  modeloEsPersonalizado: boolean = false;
  marcaEsPersonalizada: boolean = false;
  tipoSeleccionado: "particular" | "lote" | null = null;
  seccionFormulario: number = 2;
  Pregunta: "si" | "no" = "no";
  public isLoggedIn: boolean = false;

  // ----- data de selects
  marcas: any[] = [];
  modelos: any[] = [];

  public MyRole: string | null = null;
  public esDispositivoMovil: boolean = false;
  public dispositivo: string = "";
  mansaje_error: string = "";

  @ViewChild("contenedorCategorias") contenedorCategorias!: ElementRef;
  @ViewChild("contenedorForm") contenedorForm!: ElementRef;
  // -----

  constructor(
    private generalService: GeneralService,
    private carsService: CarsService,
    private router: Router,
    private motosService: MotosService,
    private menuCtrl: MenuController
  ) {
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    // Detectar tipo de dispositivo
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === "telefono" || tipo === "tablet";
      this.dispositivo = tipo;
    });
  }

  ngOnInit() {
    this.menuCtrl.close("menuLateral");
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generarListaAnios();
    this.cargarOpcionesPorRol();
  }
  seleccionar(
    tipo: "auto" | "moto" | "renta" | "lote" | "camion" | null,
    label: string,
    icono: string
  ) {
    if (label === "Lote") {
      this.mostrarCarComponent = true;
    } else {
      this.limpiarDependencias("all");
    }
    this.seleccion = tipo;
    this.mostrarSelecion = label;
    this.mostrarIcono = icono;

    this.anioSeleccionado = "";
    this.anioManual = "";
    this.mostrarInputOtroAnio = false;
    this.anioValido = false;
    this.mansaje_error = "";

    // ✅ LÓGICA SOLO PARA MOSTRAR LA PREGUNTA EN LOTERO
    if (tipo === "auto" || tipo === "moto" || tipo === "camion") {
      if (this.MyRole === "lotero") {
        // Mostrar la pregunta "Particular o Lote" en el hijo
        this.Pregunta = "si";
        this.tipoSeleccionado = null; // que elija
        this.seccionFormulario = 1; // paso de pregunta
      } else {
        // Otros roles: no mostrar esa pregunta (tu flujo actual)
        this.Pregunta = "no";
        // Mantén tu lógica de secciones tal como ya la tienes
        if (this.MyRole === "admin") {
          this.seccionFormulario = 2;
          this.tipoSeleccionado = null;
        } else {
          // vendedor/cliente u otros: tu lógica actual de pregunta "quién lo sube"
          this.tipoSeleccionado = "particular";
          this.seccionFormulario = 1;
        }
      }
    } else {
      // Renta y otros no se tocan
      this.Pregunta = "no";
      this.seccionFormulario = 2;
      this.tipoSeleccionado = null;

      this.anioSeleccionado = "";
      this.anioManual = "";

      // --- RENTA: sin año, carga marcas globales y deja modelo por <select> (se llenará con todos los años)
      if (tipo === "renta") {
        this.anioValido = true; // para habilitar el select de marca
        this.obtenerMarcasSiCorresponde(0); // carga marcas sin depender de año
        this.modeloEsPersonalizado = false; // usaremos lista de modelos
        this.modelos = [];
      }
    }

    this.generarListaAnios();

    if (this.esDispositivoMovil && this.contenedorCategorias) {
      const contenedor = this.contenedorCategorias.nativeElement;

      if (
        this.seleccion === tipo &&
        contenedor.classList.contains("seleccion-activa")
      ) {
        // Si tocas la misma carta: mostrar todas de nuevo
        contenedor.classList.remove("seleccion-activa");
        this.seleccion = null;
      } else {
        // Selección nueva: ocultar las demás
        contenedor.classList.add("seleccion-activa");
        this.seleccion = tipo;

        // Scroll hacia el formulario
        setTimeout(() => {
          this.scrollAlFormulario();
        }, 100); // 100ms suele ser suficiente
      }
    } else if (this.contenedorCategorias) {
      // Desktop: siempre mostrar todas
      this.contenedorCategorias.nativeElement.classList.remove(
        "seleccion-activa"
      );
      this.seleccion = tipo;
    }
  }

  cargarOpcionesPorRol() {
    if (this.MyRole === "admin") {
      this.opciones = [...this.opcionesBase];
    } else {
      this.opciones = [...this.opcionesBase];
    }
  }
  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    const anioSiguiente = anioActual + 1; // 2026
    const anioLimite = 2008;

    this.listaAnios = [];

    // 👉 Solo ADMIN ve 2026 en auto/moto/camion
    if (
      this.MyRole === "admin" &&
      (this.seleccion === "auto" ||
        this.seleccion === "moto" ||
        this.seleccion === "camion")
    ) {
      this.listaAnios.push(anioSiguiente);
    }

    // Para todos: del año actual hacia 2008
    for (let i = anioActual; i >= anioLimite; i--) {
      this.listaAnios.push(i);
    }
  }
  // verifica el año al escribir o seleccionar
  verificarAnio(tipo: "select" | "escrito") {
    // En renta el año no aplica
    if (this.seleccion === "renta") return;

    this.limpiarDependencias("all");

    this.mostrarInputOtroAnio = this.anioSeleccionado === "otro";

    const anio = this.obtenerAnioActual();
    this.anioValido =
      tipo === "select" ? this.validarAnio(anio) : this.validarAniOtro(anio);

      console.log(this.anioValido)

    if (this.anioValido) {
      this.mansaje_error = "";
      this.obtenerMarcasSiCorresponde(anio);
    } else {
      this.mansaje_error = "Seleciona un año entre 2007 y 1900";
      return;
    }
  }

  validarAniOtro(anio: number): boolean {
    return anio >= 1801 && anio < 2008;
  }

  validarAnio(anio: number): boolean {
    const anioActual = new Date().getFullYear();

    // Reglas SOLO para auto/moto/camion
    if (
      this.seleccion === "auto" ||
      this.seleccion === "moto" ||
      this.seleccion === "camion"
    ) {
      if (this.MyRole === "admin") {
        // Admin: 2008 .. 2026 (año actual + 1)
        return !isNaN(anio) && anio >= 2008 && anio <= anioActual + 1;
      } else {
        // Lotero / Vendedor / Cliente: 2008 .. 2025 (año actual)
        return !isNaN(anio) && anio >= 2008 && anio <= anioActual;
      }
    }

    return !isNaN(anio) && anio >= 1800 && anio <= anioActual;
  }

  esAnioAnteriorA2008(): boolean {
    if (this.seleccion === "renta") return false;
    const anio = this.obtenerAnioActual();
    return this.anioValido && anio < 2008;
  }

  obtenerAnioActual(): number {
    return this.mostrarInputOtroAnio
      ? Number(this.anioManual)
      : Number(this.anioSeleccionado);
  }

  limpiarDependencias(tipo: string): void {
    if (tipo === "marca") {
      this.modeloSeleccionado = "";
      this.modeloEsPersonalizado = false;
      this.mostrarCarComponent = false;
      this.mansaje_error = "";
    } else if (tipo === "modelo") {
      this.mostrarCarComponent = false;
      this.mansaje_error = "";
    } else if (tipo === "all") {
      this.marcaSeleccionada = "";
      this.modeloSeleccionado = "";
      this.modeloEsPersonalizado = false;
      this.marcaEsPersonalizada = false;
      this.marcas = [];
      this.modelos = [];
      this.mostrarCarComponent = false;
      this.mansaje_error = "";
    }
  }

  selecionarModelo() {
    this.limpiarDependencias("modelo");
    if (this.modeloSeleccionado === "otro") {
      this.modeloEsPersonalizado = true;
      this.modeloSeleccionado = "";
    } else {
      this.modeloEsPersonalizado = false;
    }
  }

  formularioValido(): boolean {
    // RENTA: no requiere año
    if (this.seleccion === "renta") {
      const marcaValida =
        !!this.marcaSeleccionada && this.marcaSeleccionada !== "";
      const modeloValido =
        !!this.modeloSeleccionado &&
        this.modeloSeleccionado.trim().length > 0 &&
        this.modeloSeleccionado.length <= 25;
      return marcaValida && modeloValido;
    }

    const anio = this.obtenerAnioActual();
    const anioActual = new Date().getFullYear();
    let anioEsValido = this.anioValido && anio >= 1800 && anio <= anioActual;

    if (
      this.seleccion === "auto" ||
      this.seleccion === "moto" ||
      this.seleccion === "camion"
    ) {
      if (this.MyRole === "admin") {
        // Admin: 2008 .. 2026
        anioEsValido =
          this.anioValido && anio >= 2008 && anio <= anioActual + 1;
      } else {
        // Lotero/Vendedor/Cliente: 2008 .. 2025
        anioEsValido = this.anioValido && anio >= 2008 && anio <= anioActual;
      }
    } else {
      // Renta: como lo tenías (hasta año actual)
      anioEsValido = this.anioValido && anio >= 1800 && anio <= anioActual;
    }

    const marcaValida =
      !!this.marcaSeleccionada && this.marcaSeleccionada !== "";
    const modeloValido =
      !!this.modeloSeleccionado &&
      this.modeloSeleccionado.trim().length > 0 &&
      this.modeloSeleccionado.length <= 25;

    return !!anioEsValido && marcaValida && modeloValido;
  }

  mostrarComponente() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;
    const modelo = this.modeloSeleccionado;
    const tipo = this.seleccion;

    // RENTA: sólo marca y modelo
    if (tipo === "renta") {
      if (marca && modelo) {
        this.mostrarCarComponent = true;
      } else {
        this.generalService.alert(
          "Datos incompletos",
          "Debes seleccionar una marca y un modelo para continuar.",
          "warning"
        );
        this.mostrarCarComponent = false;
      }
      return;
    }

    if (this.anioValido && marca && modelo) {
      switch (tipo) {
        case "auto":
        case "moto":
        case "camion":
          this.mostrarCarComponent = true;
          break;
        default:
          this.generalService.alert(
            "Tipo no soportado",
            "El tipo seleccionado no tiene un componente asociado.",
            "warning"
          );
          this.mostrarCarComponent = false;
          break;
      }
    } else {
      this.generalService.alert(
        "Datos incompletos",
        "Debes seleccionar un año válido, una marca y un modelo para continuar.",
        "warning"
      );
      this.mostrarCarComponent = false;
    }
  }

  volverAtras() {
    if (this.contenedorCategorias) {
      this.contenedorCategorias.nativeElement.classList.remove(
        "seleccion-activa"
      );
    }
    this.mostrarCarComponent = false;
    this.seleccion = null;
  }

  scrollAlFormulario() {
    if (this.contenedorForm) {
      const yOffset = -100; // ajusta según altura del header
      const y =
        this.contenedorForm.nativeElement.getBoundingClientRect().top +
        window.pageYOffset +
        yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  isActiva(opcionTipo: string): boolean {
    return this.seleccion === opcionTipo;
  }
  regresar() {
    window.history.back();
  }

  getMarcaNombreSeleccionada(): string {
    if (!this.marcaEsPersonalizada) {
      const marcaObj = this.marcas.find(
        (m) => m._id === this.marcaSeleccionada
      );
      return marcaObj?.nombre || "";
    } else if (this.marcaEsPersonalizada) {
      return this.marcaSeleccionada;
    }
    return this.marcaSeleccionada;
  }

  validarInputModelo(): void {
    if (!this.modeloSeleccionado || this.modeloSeleccionado.trim().length < 2) {
      this.modeloSeleccionado = "";
      this.modeloEsPersonalizado = false;
    }
  }

  // ## ----- ----- PETICIONES DE COCHES, MOTOS, CAMIONES 🛻 ----- -----
  obtenerMarcasSiCorresponde(anio: number): void {
    switch (this.seleccion) {
      case "auto":
        this.PeticionesMarcasDeAutos(anio);
        break;
      case "renta": // sin año: catálogo global
        this.carsService.getMarcas_all().subscribe({
          next: (data: Marca[]) => {
            this.marcas = (data || []).sort((a: Marca, b: Marca) =>
              (a.nombre || "")
                .toLowerCase()
                .localeCompare((b.nombre || "").toLowerCase())
            );
          },
          error: (err) => {
            const mensaje =
              err?.error?.message || "Error al cargar marcas - Renta";
            console.warn(mensaje);
          },
          complete: () => {
            this.generalService.loadingDismiss();
          },
        });
        break;
      case "moto":
        this.PeticionesMarcasDeMotos();
        break;
      case "camion":
        this.PeticionesMarcasDeCamion();
        break;
      case "lote":
        console.log("Arrendamiento próximamente...");
        break;
      default:
        console.warn("Tipo no reconocido:", this.seleccion);
        break;
    }
  }

  obtenerModelosSiCorresponde(): void {
    this.limpiarDependencias("marca");

    if (this.marcaSeleccionada === "otro") {
      this.marcaSeleccionada = "";
      this.marcaEsPersonalizada = true;
      this.modelos = [];
      return;
    }

    switch (this.seleccion) {
      case "auto":
        this.PeticionesModelosDeAutos();
        break;
      case "renta":
        this.PeticionesModelosParaRenta(this.marcaSeleccionada);
        break;
      case "moto":
        this.PeticionesModelosDeMotos();
        break;
      case "camion":
        this.PeticionesModelosDeCamion();
        break;
      case "lote":
        console.log("Arrendamiento próximamente...");
        break;
      default:
        console.warn("Tipo no reconocido:", this.seleccion);
        break;
    }
  }

  /** Modelos para AUTO (requiere año) */
  PeticionesModelosDeAutos() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;

    if (!anio || !marca || this.seleccion !== "auto") {
      return;
    }

    this.carsService.GetModelos(marca, anio).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error("Error al obtener modelos:", error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  /** Modelos para RENTA usando el mismo endpoint (sin exigir año) */
  private PeticionesModelosParaRenta(marca: string) {
    if (!marca) {
      this.modelos = [];
      return;
    }

    // Usa un año "dummy"; el backend lo ignora pero evita construir rutas inválidas
    const dummyYear = new Date().getFullYear();

    this.carsService.GetModelos(marca as any, dummyYear as any).subscribe({
      next: (data: any) => {
        // Acepta diferentes formas de payload
        const raw: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.modelos)
            ? data.modelos
            : Array.isArray(data?.data)
              ? data.data
              : [];

        // Normaliza a { modelo: string }
        const list = raw
          .map((m: any) => {
            if (m?.modelo) return { ...m, modelo: String(m.modelo).trim() };
            if (m?.nombre) return { ...m, modelo: String(m.nombre).trim() };
            if (typeof m === "string") return { modelo: m.trim() };
            return null;
          })
          .filter(Boolean) as { modelo: string }[];

        // Dedup case-insensitive
        const seen = new Set<string>();
        const unicos: any[] = [];
        for (const it of list) {
          const key = it.modelo.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unicos.push(it);
          }
        }

        // Orden alfabético
        unicos.sort((a, b) => (a.modelo || "").localeCompare(b.modelo || ""));

        this.modelos = unicos;
        this.modeloEsPersonalizado = false; // mostramos select
      },
      error: (error) => {
        console.error("Error al obtener modelos (renta):", error);
        this.modelos = [];
        // Si quieres permitir escribir manual cuando falle:
        // this.modeloEsPersonalizado = true;
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  PeticionesMarcasDeAutos(anio: number) {
    const anioActual = new Date().getFullYear();
    if (anio >= 2008 && anio <= anioActual + 1) {
      this.carsService.GetMarcas(anio).subscribe({
        next: (data) => {
          this.marcas = data;
        },
        error: (error) => {
          console.error("Error al obtener marcas:", error);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else if (anio < 2008 && anio >= 1800) {
      this.carsService.getMarcas_all().subscribe({
        next: (data: Marca[]) => {
          this.marcas = data.sort((a: Marca, b: Marca) =>
            a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
          );
        },
        error: (err) => {
          const mensaje =
            err?.error?.message || "Error al cargar marcas - Carros";
          console.warn(mensaje);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else {
      // nada
    }
  }

  PeticionesMarcasDeMotos() {
    this.motosService.getMarcas().subscribe({
      next: (data: Marca[]) => {
        this.marcas = data.sort((a: Marca, b: Marca) =>
          a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
        );
      },
      error: (err) => {
        const mensaje = err?.error?.message || "Error al cargar marcas - Motos";
        console.warn(mensaje);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  PeticionesMarcasDeCamion() {
    this.carsService.GetMarcasCamiones().subscribe({
      next: (data: Marca[]) => {
        this.marcas = data.sort((a: Marca, b: Marca) =>
          a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
        );
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || "Error al cargar marcas - camiones";
        console.warn(mensaje);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  PeticionesModelosDeCamion() {
    const marca = this.marcaSeleccionada;

    if (!marca || this.seleccion !== "camion") {
      return;
    }

    this.carsService.GetModelosCamiones(marca).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error("Error al obtener modelos:", error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  PeticionesModelosDeMotos() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;

    this.limpiarDependencias("marca");

    if (!anio || !marca || this.seleccion !== "moto") {
      this.generalService.alert(
        "Datos incompletos",
        "Por favor, selecciona un año y una marca antes de continuar.",
        "warning"
      );
      return;
    }

    this.motosService.GetModelos(marca).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error("Error al obtener modelos:", error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  irAInicio(): void {
    this.router.navigateByUrl("/inicio");
  }

  // ========= (opcional) recibir submit del componente de renta =========
  registrarRenta(evt: {
    payload: any;
    files?: {
      imagenPrincipal: File;
      imagenes?: File[];
      tarjetaCirculacion?: File;
    };
  }) {
    console.log("Submit Renta:", evt);
    // Si decides postear desde aquí en lugar del componente, aquí puedes usar RentaService.addRentalCar(...)
  }
}
