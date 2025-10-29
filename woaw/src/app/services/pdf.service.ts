import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
    providedIn: 'root'
})
export class PdfService {

    constructor() { }

    // Función principal para crear el PDF (retorna el Blob)
    async crearPDF(quote: any, datosCoche: any, coberturas: any[]): Promise<Blob> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPosition = 5;

        try {
            // Cargar imagen de encabezado como fondo
            const headerResponse = await fetch('/assets/pdf/ENCABEZADO_COTIZACION.png');
            const headerBlob = await headerResponse.blob();
            const headerUrl = URL.createObjectURL(headerBlob);

            // Agregar imagen de encabezado como fondo (ocupando todo el ancho)
            doc.addImage(headerUrl, 'PNG', 0, 0, pageWidth, 250);

            // Cargar y agregar logo sobre el encabezado
            const logoResponse = await fetch('/assets/pdf/LOGO.png');
            const logoBlob = await logoResponse.blob();
            const logoUrl = URL.createObjectURL(logoBlob);
            doc.addImage(logoUrl, 'PNG', margin, 5, 30, 25);

            // Cargar y agregar logo sobre el encabezado - LADO DERECHO
            const logoCrabi = await fetch('/assets/pdf/LOGO-CRABI.png');
            const logoBlobCrabi = await logoCrabi.blob();
            const logoUrlCrabi = URL.createObjectURL(logoBlobCrabi);
            doc.addImage(logoUrlCrabi, 'PNG', pageWidth - margin - 30, 33, 30, 25);

        } catch (error) {
            // Fallback si hay error cargando las imágenes
            doc.setFillColor(220, 53, 69);
            doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('WOAW SEGUROS', margin, 15);
            doc.text('COTIZACIÓN DE SEGURO', pageWidth / 2, 15, { align: 'center' });
        }

        // Fecha (siempre visible)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - margin, 22, { align: 'right' });

        yPosition = 45;

        // --- VIGENCIA ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica');

        const vigenciaDesde = new Date();
        const vigenciaHasta = new Date();
        vigenciaHasta.setFullYear(vigenciaHasta.getFullYear() + 1);

        doc.text(`Vigencia: ${vigenciaDesde.toLocaleDateString('es-MX')} - ${vigenciaHasta.toLocaleDateString('es-MX')} (1 año)`, margin, yPosition);
        yPosition += 15;


        // --- DATOS DEL VEHÍCULO Y CLIENTE UNO AL LADO DEL OTRO ---
        const columnaIzquierda = margin;
        const columnaDerecha = pageWidth / 2 + 10;

        // Título VEHÍCULO (ROJO)
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del vehículo:', columnaIzquierda, yPosition);

        // Título CLIENTE (ROJO)
        doc.text('Datos del cliente:', columnaDerecha, yPosition);
        yPosition += 6;

        // Datos del VEHÍCULO (NEGRO)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const vehicleLines = [
            `Marca: ${quote.vehicle?.brand?.name || datosCoche.marca}`,
            `Modelo: ${quote.vehicle?.model?.name || datosCoche.modelo}`,
            `Año: ${quote.vehicle?.year?.name || datosCoche.anio}`,
            `Versión: ${quote.vehicle?.version?.name || datosCoche.version}`
        ];

        let tempY = yPosition;
        vehicleLines.forEach(line => {
            doc.text(line, columnaIzquierda, tempY);
            tempY += 5;
        });

        // Datos del CLIENTE (NEGRO)
        const clientLines = [
            `Fecha de nacimiento: ${this.formatFecha(datosCoche.nacimiento)}`,
            `Código postal: ${quote.region?.postal_code || datosCoche.cp}`,
            `Género: ${datosCoche.genero || 'No especificado'}`,
            `Estado civil: ${datosCoche.estadoCivil || 'No especificado'}`
        ];

        tempY = yPosition;
        clientLines.forEach(line => {
            doc.text(line, columnaDerecha, tempY);
            tempY += 5;
        });

        // Ajustar yPosition al final de la columna más larga
        yPosition = Math.max(
            yPosition + (vehicleLines.length * 5),
            yPosition + (clientLines.length * 5)
        ) + 10;

        // --- COBERTURAS INCLUIDAS (TÍTULO EN ROJO) ---

        doc.setFillColor(220, 53, 69);
        doc.rect(margin, yPosition - 4.5, pageWidth - (2 * margin), 6, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('COBERTURAS INCLUIDAS', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 7;

        // Tabla de coberturas SIN líneas
        const coverageData = coberturas.map(cov => [
            this.truncateText(cov.label, 40),
            cov.amountText || 'Incluido',
            cov.deductible ? `${(cov.deductible * 100)}%` : '--'
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['Cobertura', 'Suma Asegurada', 'Deducible']],
            body: coverageData,
            theme: 'plain',
            styles: {
                fontSize: 10,
                cellPadding: 1,
                minCellHeight: 5,
                lineColor: [255, 255, 255],
                lineWidth: 0
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [220, 53, 69],
                fontStyle: 'bold',
                lineColor: [255, 255, 255],
                lineWidth: 0
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineColor: [255, 255, 255],
                lineWidth: 0
            },
            margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 12;

        // --- OPCIONES DE PAGO ---
        if (quote.plans?.[0]) {
            const plan = quote.plans[0];
            const paymentPlans = plan?.discount?.payment_plans || plan?.payment_plans;

            if (paymentPlans && paymentPlans.length > 0) {
                doc.setFillColor(220, 53, 69);
                doc.rect(margin, yPosition - 4.5, pageWidth - (2 * margin), 6, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('OPCIONES DE PAGO', pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 7;

                const plansData = paymentPlans.map((pp: any) => [
                    this.getPaymentPlanLabelSimple(pp),
                    this.formatMoney(pp.total),
                    this.getPaymentDetailsSimple(pp)
                ]);

                autoTable(doc, {
                    startY: yPosition,
                    head: [['Plan', 'Total', 'Detalles']],
                    body: plansData,
                    theme: 'plain',
                    styles: {
                        fontSize: 10,
                        cellPadding: 1,
                        minCellHeight: 1,
                        lineColor: [255, 255, 255],
                        lineWidth: 0
                    },
                    headStyles: {
                        fillColor: [255, 255, 255],
                        textColor: [220, 53, 69],
                        fontStyle: 'bold',
                        lineColor: [255, 255, 255],
                        lineWidth: 0
                    },
                    bodyStyles: {
                        fillColor: [255, 255, 255],
                        textColor: [0, 0, 0],
                        lineColor: [255, 255, 255],
                        lineWidth: 0
                    },
                    margin: { left: margin, right: margin }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 20;

                // --- DESCUENTO ---
                if (plan.discount) {
                    doc.setFontSize(15);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 0, 0);

                    let discountText = '';
                    if (plan.discount.percentage) {
                        discountText = `¡${plan.discount.percentage}% DE DESCUENTO APLICADO!`;
                    } else if (plan.discount.marketing_text?.default) {
                        discountText = plan.discount.marketing_text.default;
                    }

                    if (discountText) {
                        doc.text(discountText, pageWidth / 2, yPosition, { align: 'center' });
                        yPosition += 8;
                    }
                }
            }
        }

        // --- FOOTER ---
        let footerY = 270;
        if (yPosition > 250) {
            footerY = Math.min(280, yPosition + 15);
            if (footerY > 280) {
                doc.addPage();
                footerY = 20;
            }
        }

        // --- NOTAS FINALES ---
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');

        const notes = [
            '• Cotización válida por 30 días • Precios en MXN • Deducible por evento',
            'Woaw Seguros - www.woaw.com.mx - Tel: +52 (442) 77 06 776'
        ];

        notes.forEach((note, index) => {
            doc.text(note, pageWidth / 2, footerY + (index * 3), { align: 'center' });
        });

        // Convertir a Blob
        const pdfBlob = doc.output('blob');
        return pdfBlob;
    }

    // Función para previsualizar el PDF en nueva pestaña
    async previsualizarPDF(quote: any, datosCoche: any, coberturas: any[]): Promise<void> {
        try {
            const pdfBlob = await this.crearPDF(quote, datosCoche, coberturas);
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Abrir en nueva pestaña
            window.open(pdfUrl, '_blank');

            // Limpiar la URL después de un tiempo
            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 1000);

        } catch (error) {
            console.error('Error al previsualizar PDF:', error);
            throw error;
        }
    }

    // Función para descargar el PDF directamente
    async descargarPDF(quote: any, datosCoche: any, coberturas: any[]): Promise<void> {
        try {
            const pdfBlob = await this.crearPDF(quote, datosCoche, coberturas);
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Cotizacion_Woaw_${quote.vehicle?.brand?.name || 'Auto'}_${new Date().getTime()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Limpiar la URL
            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 1000);

        } catch (error) {
            console.error('Error al descargar PDF:', error);
            throw error;
        }
    }

    // Métodos auxiliares (sin cambios)
    private truncateText(text: string, maxLength: number): string {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

    private getPaymentPlanLabelSimple(payment: any): string {
        if (!payment) return 'Pago único';

        const name = (payment?.name || '').toUpperCase();
        const count = Array.isArray(payment?.payments) ? payment.payments.length : 1;

        switch (name) {
            case 'ANNUAL': return 'Contado';
            case 'SUBSCRIPTION': return `${count} Pagos`;
            case 'FLAT_FEE': return `${count} Pagos`;
            case 'MSI': return `${count} MSI`;
            default: return this.truncateText(name, 10);
        }
    }

    private getPaymentDetailsSimple(payment: any): string {
        if (!payment) return '';

        const payments = Array.isArray(payment?.payments) ? payment.payments : [];

        if (payments.length === 1) {
            return this.formatMoney(payments[0]?.total);
        } else if (payments.length > 1) {
            const first = payments[0]?.total;
            const rest = payments.slice(1);
            const allEqual = rest.every((p: any) => p.total === rest[0]?.total);

            if (allEqual) {
                return `${this.formatMoney(first)} + ${rest.length}×${this.formatMoney(rest[0]?.total)}`;
            }
        }

        return this.formatMoney(payment.total);
    }
}