import { Component, OnInit } from "@angular/core";
import { GeneralService } from "../../../services/general.service";
import { SeguroService } from "../../../services/seguro.service";
import { Router } from "@angular/router";

interface PolizaUI {
  _id: string;
  folio: string;
  vigenciaInicio: Date | null;
  vigenciaFin: Date | null;
  vehiculo: string;
  rfcPlacas: string;
  plan: string;
  rfc: string;
  placas: string;
}

@Component({
  selector: "app-ver-polizas",
  templateUrl: "./ver-polizas.page.html",
  styleUrls: ["./ver-polizas.page.scss"],
  standalone: false,
})
export class VerPolizasPage implements OnInit {
  // Ahora guardamos "crudo"
  polizas: any[] = [];
  cargando = false;
  totalPolizas = 0;
i: any;

  constructor(
    private generalService: GeneralService,
    private seguroService: SeguroService,
    private Router: Router
  ) {}



  redirigir(ruta: string) {
    this.Router.navigate([ruta]);
  }

  ngOnInit() {
    this.getPolizas();
  }

  // ====== Carga (sin map) ======
  private getPolizas(): void {
    this.cargando = true;
    this.seguroService.getPolizas().subscribe({
      next: (res) => {
        const items: any[] = Array.isArray(res?.items) ? res.items : [];
        this.polizas = items;
        this.totalPolizas = items.length;
        this.cargando = false;
        console.log(res);
      },
      error: (error) => {
        this.cargando = false;
        console.error("Error al obtener pólizas:", error);
        this.generalService.alert(
          "No se pudieron cargar tus pólizas.",
          "Error",
          "danger"
        );
      },
    });
  }

  // ====== Helpers de lectura para el template ======
  idOf(item: any): string {
    const resp = item?.response ?? {};
    const policyNumbers: string[] = Array.isArray(item?.policy_numbers)
      ? item.policy_numbers
      : [];
    const possible =
      item?._id ||
      resp?.policyNumber ||
      item?.main_policy_number ||
      policyNumbers[0] ||
      "";
    return String(possible || "");
  }

  folioOf(item: any): string {
    const resp = item?.response ?? {};
    const policies: any[] = Array.isArray(resp?.policies) ? resp.policies : [];
    const policyCO = policies.find((p) =>
      String(p?.policy_number ?? "")
        .toUpperCase()
        .startsWith("CO-")
    );
    const policy = policyCO ?? policies[0] ?? null;

    const policyNumbers: string[] = Array.isArray(item?.policy_numbers)
      ? item.policy_numbers
      : [];
    const folio =
      (policy?.policy_number ??
        policyNumbers.find((n) => String(n).toUpperCase().startsWith("CO-")) ??
        item?.main_policy_number ??
        resp?.policyNumber ??
        resp?.number ??
        "") + "";
    return folio;
  }

  vigenciaInicioOf(item: any): Date | null {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    const policies: any[] = Array.isArray(resp?.policies) ? resp.policies : [];
    const policyCO = policies.find((p) =>
      String(p?.policy_number ?? "")
        .toUpperCase()
        .startsWith("CO-")
    );
    const policy = policyCO ?? policies[0] ?? null;
    const iniRaw =
      policy?.start_date ?? req?.start_date ?? req?.startDate ?? null;
    return iniRaw ? new Date(iniRaw) : null;
  }

  vigenciaFinOf(item: any): Date | null {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    const policies: any[] = Array.isArray(resp?.policies) ? resp.policies : [];
    const policyCO = policies.find((p) =>
      String(p?.policy_number ?? "")
        .toUpperCase()
        .startsWith("CO-")
    );
    const policy = policyCO ?? policies[0] ?? null;
    const finRaw = policy?.end_date ?? req?.end_date ?? req?.endDate ?? null;
    return finRaw ? new Date(finRaw) : null;
  }

  vehiculoOf(item: any): string {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    const v =
      resp?.vehicle ??
      resp?.policy?.vehicle ??
      req?.vehicle ??
      req?.vehicleData ??
      {};
    const parts = [v?.brand ?? v?.make, v?.model, v?.year, v?.version].filter(
      Boolean
    );
    if (parts.length) return parts.join(" ").trim();
    return v?.vin ? String(v.vin) : "—";
  }

  rfcOf(item: any): string {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    return (
      resp?.holder?.rfc ??
      resp?.insured?.rfc ??
      resp?.customer?.rfc ??
      req?.rfc ??
      req?.holder?.rfc ??
      "—"
    );
  }

  placasOf(item: any): string {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    const v =
      resp?.vehicle ??
      resp?.policy?.vehicle ??
      req?.vehicle ??
      req?.vehicleData ??
      {};
    return v?.plates ?? v?.plate ?? req?.plates ?? req?.plate ?? "—";
  }

  planOf(item: any): string {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};
    const plan =
      resp?.policy?.plan?.name ??
      resp?.planName ??
      resp?.plan ??
      resp?.product?.name ??
      resp?.product ??
      resp?.package ??
      req?.plan ??
      req?.planName ??
      "";
    return String(plan || "Plan").trim();
  }

  // ====== Normalización puntual para el detalle ======
  private toUI(item: any): PolizaUI {
    const resp = item?.response ?? {};
    const req = item?.request ?? {};

    const policies: any[] = Array.isArray(resp?.policies) ? resp.policies : [];
    const policyCO = policies.find((p) =>
      String(p?.policy_number ?? "")
        .toUpperCase()
        .startsWith("CO-")
    );
    const policy = policyCO ?? policies[0] ?? null;

    const policyNumbers: string[] = Array.isArray(item?.policy_numbers)
      ? item.policy_numbers
      : [];
    const folio =
      (policy?.policy_number ??
        policyNumbers.find((n) => String(n).toUpperCase().startsWith("CO-")) ??
        item?.main_policy_number ??
        resp?.policyNumber ??
        resp?.number ??
        "") + "";

    const iniRaw =
      policy?.start_date ?? req?.start_date ?? req?.startDate ?? null;
    const finRaw = policy?.end_date ?? req?.end_date ?? req?.endDate ?? null;
    const vigenciaInicio = iniRaw ? new Date(iniRaw) : null;
    const vigenciaFin = finRaw ? new Date(finRaw) : null;

    const v =
      resp?.vehicle ??
      resp?.policy?.vehicle ??
      req?.vehicle ??
      req?.vehicleData ??
      {};
    const vehiculoParts = [
      v?.brand ?? v?.make,
      v?.model,
      v?.year,
      v?.version,
    ].filter(Boolean);
    const vehiculo = vehiculoParts.length
      ? vehiculoParts.join(" ").trim()
      : v?.vin
      ? `${v.vin}`
      : "";

    const placas = v?.plates ?? v?.plate ?? req?.plates ?? req?.plate ?? "";

    const rfc =
      resp?.holder?.rfc ??
      resp?.insured?.rfc ??
      resp?.customer?.rfc ??
      req?.rfc ??
      req?.holder?.rfc ??
      "";

    const rfcPlacas = [rfc, placas].filter(Boolean).join(" - ");

    const plan =
      resp?.policy?.plan?.name ??
      resp?.planName ??
      resp?.plan ??
      resp?.product?.name ??
      resp?.product ??
      resp?.package ??
      req?.plan ??
      req?.planName ??
      "";

    return {
      _id: item?._id || folio,
      folio,
      vigenciaInicio,
      vigenciaFin,
      vehiculo,
      rfcPlacas,
      rfc,
      placas,
      plan: String(plan).trim(),
    };
  }

  trackById = (_: number, item: any) => this.idOf(item);

  public detallesPoliza(item: any) {
    const polizaUI = this.toUI(item);
    const polizaRaw = item;

    this.Router.navigate(["seguros/detalle-poliza"], {
      state: { polizaRaw, polizaUI },
    });
  }
}
