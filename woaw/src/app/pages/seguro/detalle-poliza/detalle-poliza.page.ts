import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SeguroService } from "../../../services/seguro.service";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

interface PolizaUI {
  _id: string;
  folio: string;
  vigenciaInicio: Date | null;
  vigenciaFin: Date | null;
  vehiculo: string;
  rfcPlacas: string;
  rfc: string;
  placas: string;
  plan: string;
}

type Policy = {
  policy_number?: string;
  policy_id?: string;
  policy_type_id?: string;
  start_date?: string;
  end_date?: string;
};

type FileItem = {
  name?: string;
  url?: string;
  bucket?: string;
  key?: string;
};

type PolizaRaw = {
  response?: {
    policies?: Policy[];
    files?: FileItem[];
  };
  policy_numbers?: string[];
  policy_ids?: string[];
  main_policy_id?: string;
};

@Component({
  selector: "app-detalle-poliza",
  templateUrl: "./detalle-poliza.page.html",
  styleUrls: ["./detalle-poliza.page.scss"],
  standalone: false,
})
export class DetallePolizaPage implements OnInit {
 
  polizaRaw: any = null;
  polizaUI: PolizaUI | null = null;
  cargando = true;
  descargando = false;

  constructor(private router: Router, private seguroService: SeguroService) {}

  redirigir(ruta: string) {
    this.router.navigate([ruta]);
  }
  ngOnInit(): void {
    const nav = history.state || {};
    if (nav.polizaRaw) {
      this.polizaRaw = nav.polizaRaw;
      this.polizaUI = nav.polizaUI ?? this.toUI(nav.polizaRaw);
      this.cargando = false;
      console.log(this.polizaRaw);
    }
  }

  // ——— Conversión visual ———
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

    const folio =
      (policy?.policy_number ??
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
      : v?.vin || "";

    const placas = v?.plates ?? v?.plate ?? "";
    const rfc =
      resp?.holder?.rfc ??
      resp?.insured?.rfc ??
      resp?.customer?.rfc ??
      req?.rfc ??
      "";

    const rfcPlacas = [rfc, placas].filter(Boolean).join(" - ");

    const plan =
      resp?.policy?.plan?.name ??
      resp?.planName ??
      resp?.product?.name ??
      resp?.product ??
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

  // ——— Helpers ———
  get policies(): any[] {
    return Array.isArray(this.polizaRaw?.response?.policies)
      ? this.polizaRaw.response.policies
      : [];
  }

  get archivos(): FileItem[] {
    const files = this.polizaRaw?.response?.files;
    return Array.isArray(files) ? files : [];
  }

  private resolvePolicyIdFromRawCO(): string | null {
    const raw = this.polizaRaw as PolizaRaw;
    const policies = raw?.response?.policies ?? [];
    const norm = (s?: string) =>
      typeof s === "string" ? s.trim().toUpperCase() : "";

    const matchCO = policies.find((p) =>
      norm(p.policy_number).startsWith("CO-")
    );
    if (matchCO?.policy_id) return matchCO.policy_id;

    return raw?.main_policy_id ?? null;
  }

  public descargarPolizaYComprobante(): void {
    this.descargando = true;

    const policyId = this.resolvePolicyIdFromRawCO();
    if (!policyId) {
      console.warn("No se pudo resolver policy_id (CO-).");
      this.descargando = false;
      return;
    }

    this.seguroService.getPolizayRecibo(policyId).subscribe({
      next: (res: any[]) => {
        console.log(res);
      },

      error: () => {},
    });
  }

  public PagoPoliza() {
    this.descargando = true;

    const policyId = this.resolvePolicyIdFromRawCO();
    if (!policyId) {
      console.warn("No se pudo resolver policy_id (CO-).");
      this.descargando = false;
      return;
    }

    this.seguroService.getPagoPoliza(policyId).subscribe({
      next: (res: any[]) => {
        console.log(res);
      },

      error: () => {},
    });
  }
}
