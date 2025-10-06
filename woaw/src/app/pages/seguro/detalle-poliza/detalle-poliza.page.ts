import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SeguroService } from "../../../services/seguro.service";

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

@Component({
  selector: "app-detalle-poliza",
  templateUrl: "./detalle-poliza.page.html",
  styleUrls: ["./detalle-poliza.page.scss"],
  standalone: false,
})
export class DetallePolizaPage implements OnInit {
  polizaRaw: any = null; // TODO el objeto completo
  polizaUI: PolizaUI | null = null;
  cargando = true;

  constructor(private router: Router, private seguroService: SeguroService) {}

  ngOnInit(): void {
    const nav = history.state || {};
    if (nav.polizaRaw) {
      this.polizaRaw = nav.polizaRaw;
      this.polizaUI = nav.polizaUI ?? this.toUI(nav.polizaRaw);
      this.cargando = false;
      console.log(this.polizaRaw);
    }
  }

  private tryGetIdFromUrl(): string | null {
    // Si tu ruta es algo como /seguros/detalle-poliza/:id, usa ActivatedRoute y saca el param.
    return null;
  }

  // ——— MISMA normalización que ya tienes ———
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

  // Helpers útiles en la vista del detalle
  get archivos(): Array<{ name: string; url: string }> {
    const files = this.polizaRaw?.response?.files;
 
    if (Array.isArray(files)) return files; 
 
    const f: Array<{ name: string; url: string }> = [];
    if (this.polizaRaw?.cover_pdf_url)
      f.push({ name: "cover", url: this.polizaRaw.cover_pdf_url });
    if (this.polizaRaw?.invoice_pdf_url)
      f.push({ name: "invoice", url: this.polizaRaw.invoice_pdf_url });
    return f;
  }

  get policies(): any[] {
    return Array.isArray(this.polizaRaw?.response?.policies)
      ? this.polizaRaw.response.policies
      : [];
  }
}
