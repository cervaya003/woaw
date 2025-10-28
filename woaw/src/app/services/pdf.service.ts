import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  async generarCotizacionSeguro(quote: any, datosCoche: any, coberturas: any[]): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // --- HEADER CON COLORES WOAW (ROJO Y NEGRO) ---
    doc.setFillColor(220, 53, 69); // Rojo Woaw
    doc.rect(0, 0, pageWidth, 80, 'F');
    
    // Logo - Intentar cargar la imagen
    try {
      const logoResponse = await fetch('/assets/icon/logo3.png');
      const logoBlob = await logoResponse.blob();
      const logoUrl = URL.createObjectURL(logoBlob);
      
      doc.addImage(logoUrl, 'PNG', margin, 5, 20, 20);
    } catch (error) {
      console.warn('No se pudo cargar el logo, continuando sin él');
      // Si falla el logo, mostrar texto
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('WOAW', margin, 35);
    }
    
    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN DE SEGURO', pageWidth / 2, 40, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Woaw Seguros - Tu protección en camino', pageWidth / 2, 50, { align: 'center' });
    
    // Fecha
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - margin, 70, { align: 'right' });

    let yPosition = 100;

    // --- INFORMACIÓN DEL VEHÍCULO ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL VEHÍCULO', margin, yPosition);
    yPosition += 4;

    const vehicleInfo = [
      ['Marca:', quote.vehicle?.brand?.name || datosCoche.marca],
      ['Modelo:', quote.vehicle?.model?.name || datosCoche.modelo],
      ['Año:', quote.vehicle?.year?.name || datosCoche.anio],
      ['Versión:', quote.vehicle?.version?.name || datosCoche.version],
      ['Código Postal:', quote.region?.postal_code || datosCoche.cp]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Campo', 'Valor']],
      body: vehicleInfo,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 53, 69], // Rojo Woaw
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // --- INFORMACIÓN PERSONAL ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN PERSONAL', margin, yPosition);
    yPosition += 4;

    const personalInfo = [
      ['Fecha de Nacimiento:', this.formatFecha(datosCoche.nacimiento)],
      ['Género:', datosCoche.genero || 'No especificado'],
      ['Estado Civil:', datosCoche.estadoCivil || 'No especificado']
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Campo', 'Valor']],
      body: personalInfo,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 53, 69], // Rojo Woaw
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // --- RESUMEN DE COBERTURAS ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COBERTURAS INCLUIDAS', margin, yPosition);
    yPosition += 4;

    const coverageData = coberturas.map(cov => [
      cov.label,
      cov.amountText || 'Incluido',
      cov.deductible ? `${(cov.deductible * 100)}%` : 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Cobertura', 'Suma Asegurada', 'Deducible']],
      body: coverageData,
      theme: 'grid',
      headStyles: { 
        fillColor: [33, 37, 41], // Negro Woaw
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // --- TODOS LOS PLANES DE PAGO DISPONIBLES ---
    if (quote.plans?.[0]) {
      const plan = quote.plans[0];
      const paymentPlans = plan?.discount?.payment_plans || plan?.payment_plans;
      
      if (paymentPlans && paymentPlans.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('PLANES DE PAGO DISPONIBLES', margin, yPosition);
        yPosition += 4;

        // Crear tabla con TODOS los planes
        const allPlansData = paymentPlans.map((pp: any, index: number) => [
          this.getPaymentPlanLabel(pp),
          this.formatMoney(pp.total),
          this.getPaymentDetails(pp)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Plan de Pago', 'Total', 'Detalles']],
          body: allPlansData,
          theme: 'grid',
          headStyles: { 
            fillColor: [220, 53, 69], // Rojo Woaw
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          margin: { left: margin, right: margin },
          styles: { 
            fontSize: 9,
            cellPadding: 3
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- DETALLE DEL PLAN SELECCIONADO ---
      const selectedPayment = this.getSelectedPaymentFromPlan(plan);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DEL PLAN SELECCIONADO', margin, yPosition);
      yPosition += 4;

      const paymentData = [
        ['Plan Seleccionado:', plan.name || 'Plan Personalizado'],
        ['Forma de Pago:', this.getPaymentPlanLabel(selectedPayment)],
        ['Prima Neta:', this.formatMoney(selectedPayment?.net_premium)],
        ['Derechos (Expedición):', this.formatMoney(selectedPayment?.expedition_rights)],
        ['Comisión/Recargos:', this.formatMoney(selectedPayment?.fee)],
        ['Subtotal:', this.formatMoney(selectedPayment?.subtotal)],
        ['IVA:', this.formatMoney(selectedPayment?.taxes)],
        ['TOTAL:', this.formatMoney(selectedPayment?.total)]
      ];

      autoTable(doc, {
        startY: yPosition,
        body: paymentData,
        theme: 'grid',
        headStyles: { 
          fillColor: [220, 53, 69], // Rojo Woaw
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        styles: { 
          fontStyle: 'bold',
          textColor: [0, 0, 0]
        },
        bodyStyles: {
          fillColor: [255, 255, 255]
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // --- DESCUENTOS Y PROMOCIONES ---
      if (plan.discount) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69); // Rojo Woaw
        doc.text('DESCUENTOS APLICADOS', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        if (plan.discount.marketing_text?.default) {
          doc.text(`• ${plan.discount.marketing_text.default}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        if (plan.discount.amount) {
          doc.text(`• Descuento: ${this.formatMoney(plan.discount.amount)}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        if (plan.discount.percentage) {
          doc.text(`• Porcentaje de descuento: ${plan.discount.percentage}%`, margin + 5, yPosition);
          yPosition += 6;
        }

        yPosition += 4;
      }

      // --- NOTAS IMPORTANTES ---
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69); // Rojo Woaw para títulos
      doc.text('NOTAS IMPORTANTES:', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Negro para el contenido
      const notes = [
        '• Esta cotización es válida por 30 días a partir de la fecha de generación.',
        '• Los precios están expresados en pesos mexicanos (MXN).',
        '• El deducible aplica por evento siniestrado.',
        '• La póliza está sujeta a términos y condiciones establecidos en el contrato.',
        '• Para activar tu seguro, completa el proceso de contratación en nuestra plataforma.',
        '• Woaw Seguros - Confianza y protección en cada kilómetro.'
      ];

      notes.forEach(note => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(note, margin + 5, yPosition);
        yPosition += 4;
      });
    }

    // --- FOOTER ---
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Woaw Seguros - www.woaw.com.mx - Tel:  +52 (442) 77 06 776', pageWidth / 2, footerY, { align: 'center' });

    // Guardar PDF
    const fileName = `Cotizacion_Woaw_Seguros_${quote.vehicle?.brand?.name || 'Auto'}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  }

  private formatFecha(nacimiento: any): string {
    if (!nacimiento) return 'No especificado';
    return `${nacimiento.dia}/${nacimiento.mes}/${nacimiento.anio}`;
  }

  private formatMoney(amount: number): string {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  private getSelectedPaymentFromPlan(plan: any): any {
    const paymentPlans = plan?.discount?.payment_plans || plan?.payment_plans;
    return paymentPlans?.[0] || null;
  }

  private getPaymentPlanLabel(payment: any): string {
    if (!payment) return 'No especificado';
    
    const name = (payment?.name || '').toUpperCase();
    const count = Array.isArray(payment?.payments) ? payment.payments.length : 1;
    
    switch (name) {
      case 'ANNUAL': return 'Pago de contado';
      case 'SUBSCRIPTION': return count > 1 ? `${count} Suscripción` : 'Suscripción';
      case 'FLAT_FEE': return count > 1 ? `${count} Pagos fijos` : 'Pago fijo';
      case 'MSI': return count > 1 ? `${count} Meses sin intereses` : 'Pago fijo';
      default: return name;
    }
  }

  private getPaymentDetails(payment: any): string {
    if (!payment) return '';
    
    const payments = Array.isArray(payment?.payments) ? payment.payments : [];
    
    if (payments.length === 1) {
      return `1 pago de ${this.formatMoney(payments[0]?.total)}`;
    } else if (payments.length > 1) {
      const first = payments[0]?.total;
      const rest = payments.slice(1);
      const allEqual = rest.every((p: any) => p.total === rest[0]?.total);
      
      if (allEqual) {
        return `1er pago: ${this.formatMoney(first)} + ${rest.length} pagos de ${this.formatMoney(rest[0]?.total)}`;
      } else {
        return `${payments.length} pagos variables`;
      }
    }
    
    return 'Detalles no disponibles';
  }
}