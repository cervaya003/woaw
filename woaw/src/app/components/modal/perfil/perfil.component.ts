import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule, MenuController, AlertController, ModalController } from "@ionic/angular";
import { Router, RouterModule } from "@angular/router";
import { RegistroService } from "../../../services/registro.service";
import { GeneralService } from "../../../services/general.service";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";

@Component({
  selector: "app-perfil",
  templateUrl: "./perfil.component.html",
  styleUrls: ["./perfil.component.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule], // ⟵ agregado RouterModule
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PerfilComponent implements OnInit {
  usuario: any;
  fotoPerfil: string | null = null;
  formCambio: FormGroup;
  mostrarCambio: boolean = false;

  verActual: boolean = true;
  verNuevas: boolean = true;

  constructor(
    private modalCtrl: ModalController,
    private registroService: RegistroService,
    private generalService: GeneralService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private router: Router // ⟵ inyectado Router
  ) {
    this.formCambio = this.fb.group({
      password: ["", [Validators.required]],
      newPassword: ["", [Validators.required, this.validarPassword]],
      newPasswordconf: ["", [Validators.required]],
    });
  }

  ngOnInit() {
    const storage = localStorage.getItem("user");
    if (storage) {
      try {
        this.usuario = JSON.parse(storage);
        this.fotoPerfil = this.getFotoFromUser(this.usuario);
      } catch {
        this.usuario = null;
        this.fotoPerfil = null;
      }
    }
  }

  // ⟵ NUEVO: usar en (click) del ion-card de "Eliminar cuenta"
 async goEliminarCuenta() {
    try {
      // Si el modal está abierto, lo cerramos con pequeña espera
      await this.modalCtrl.dismiss();
      setTimeout(() => {
        this.router.navigateByUrl("/eliminacion-cuenta");
      }, 150); // 🔹 pequeño delay para transición limpia
    } catch (err) {
      // Si no hay modal, igual navega
      this.router.navigateByUrl("/eliminacion-cuenta");
    }
  }

  private getFotoFromUser(u: any): string | null {
    const candidatos: any[] = [
      u?.foto, u?.picture, u?.photoURL, u?.photoUrl, u?.image, u?.imageUrl,
      u?.avatar, u?.avatarUrl, u?.profilePic, u?.profile_picture, u?.profilePhoto,
      u?._json?.picture, u?._json?.image,
      u?.providerData?.[0]?.photoURL, u?.datosGoogle?.picture
    ].filter(Boolean);

    if (!candidatos.length) return null;

    const urlHttp = candidatos.find((v: any) => /^https?:\/\//i.test(String(v)));
    const url = (urlHttp || String(candidatos[0])).toString().trim();
    return url || null;
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  async cambiarPassword() {
    if (this.formCambio.invalid) return;

    await this.generalService.loading("Actualizando contraseña...");

    const { password, newPassword, newPasswordconf } = this.formCambio.value;

    if (newPassword !== newPasswordconf) {
      await this.generalService.loadingDismiss();
      return this.generalService.alert(
        "Error",
        "La nueva contraseña y su confirmación no coinciden.",
        "danger"
      );
    }

    const data = { password, newPassword };

    this.registroService.cambiarPassword(data).subscribe({
      next: async () => {
        this.formCambio.reset();
        this.mostrarCambio = false;
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          "Contraseña actualizada",
          "Tu contraseña ha sido cambiada exitosamente.",
          "success"
        );
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        const mensaje =
          err?.error?.message ||
          "No se pudo cambiar la contraseña. Intenta más tarde.";
        await this.generalService.alert("Error", mensaje, "danger");
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  validarPassword(control: any) {
    const valor = control.value;
    if (!valor) return null;

    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\[\]{}\-_=+¿?¡.,;:<>|/~`°¨^\\@_])[\w\WñÑáéíóúÁÉÍÓÚ]{8,}$/;

    return regex.test(valor)
      ? null
      : {
          passwordInvalida: {
            mensaje:
              "Debe tener mínimo 6 caracteres, una mayúscula, un número y un carácter especial.",
          },
        };
  }
}
