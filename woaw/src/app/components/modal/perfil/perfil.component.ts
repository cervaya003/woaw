import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { MenuController } from "@ionic/angular";
import { Router, NavigationStart } from "@angular/router";
import { RegistroService } from "../../../services/registro.service";
import { AlertController } from "@ionic/angular";
import { GeneralService } from "../../../services/general.service";
import { ModalController } from "@ionic/angular";
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
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class PerfilComponent implements OnInit {
  usuario: any;
  formCambio: FormGroup;
  mostrarCambio: boolean = false;

  verActual: boolean = true;
  verNuevas: boolean = true;

  constructor(
    private modalCtrl: ModalController,
    private registroService: RegistroService,
    private generalService: GeneralService,
    private fb: FormBuilder,
    private alertCtrl: AlertController
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
      this.usuario = JSON.parse(storage);
    }
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  async cambiarPassword() {
    if (this.formCambio.invalid) return;

    // Mostrar spinner
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

    const data = {
      password,
      newPassword,
    };

    this.registroService.cambiarPassword(data).subscribe({
      next: async (res) => {
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
          err.error?.message ||
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
