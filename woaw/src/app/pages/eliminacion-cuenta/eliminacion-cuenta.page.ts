import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { RegistroService } from "src/app/services/registro.service";
import { GeneralService } from "src/app/services/general.service";
@Component({
  selector: "app-eliminacion-cuenta",
  templateUrl: "./eliminacion-cuenta.page.html",
  styleUrls: ["./eliminacion-cuenta.page.scss"],
  standalone: false,
})
export class EliminacionCuentaPage implements OnInit {
  fotoPerfil: string | null = null;
  usuario: any;
  nombreCompleto: string | null = null;

  // ✅ control de UI
  confirmed = false;
  loading = false;

  constructor(
    private registroService: RegistroService,
    private router: Router,
    private sibis: GeneralService
  ) {}

  ngOnInit() {
    const storage = localStorage.getItem("user");
    if (storage) {
      try {
        this.usuario = JSON.parse(storage);
        this.fotoPerfil = this.getFotoFromUser(this.usuario);
        this.nombreCompleto = this.getNombreFromUser(this.usuario);
      } catch {
        this.usuario = null;
        this.fotoPerfil = null;
        this.nombreCompleto = null;
      }
    }
  }

  // 🔘 Acción de eliminar
  onDelete() {
    if (!this.confirmed || this.loading) return;

    const accountId = this.getAccountIdFromUser(this.usuario);
    if (!accountId) {
      console.error("No se pudo determinar el ID de la cuenta del usuario.");
      return;
    }

    this.loading = true;

    this.registroService.deleteAccount().subscribe({
      next: (resp) => {
        localStorage.clear();
        this.sibis.alert("¡Nos vemos!", "Cuenta eliminada", "success");
        this.router.navigateByUrl("/inicio");
      },
      error: (err) => {
        console.error("Error eliminando cuenta:", err);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  private getFotoFromUser(u: any): string | null {
    const url = u?.foto || u?.photoURL || u?.picture || "";
    return url && url.startsWith("http") ? url.trim() : null;
  }

  private getNombreFromUser(u: any): string | null {
    const nombre =
      u?.nombre ||
      u?.given_name ||
      u?.displayName ||
      u?.name ||
      u?._json?.name ||
      "";

    const apellidos = u?.apellidos || u?.family_name || "";

    const full = `${nombre} ${apellidos}`.trim();
    return full.length ? full : null;
  }

  private getAccountIdFromUser(u: any): string | null {
    // Intenta cubrir los campos típicos
    return (u?.id || u?._id || u?.userId || u?.sub || u?.uid || null) as
      | string
      | null;
  }
}
