// js/resume.js

const resume = {
    init: () => {
        const btnDesktop = document.getElementById('btn-nav-resumen');
        if (btnDesktop) {
            btnDesktop.addEventListener('click', () => {
                ui.showSection('v-resumen');
                const activeBtn = document.querySelector('.nav-btn.active');
                if (activeBtn) activeBtn.classList.remove('active');
                btnDesktop.classList.add('active');
                
                resume.renderizar();
            });
        }
        console.log('%c📋 Módulo Resumen de Informe Inicializado', 'color: #22c55e; font-weight: bold;');
    },

    formatearTexto: (texto) => {
        if (!texto) return '';
        return texto.split('\n').filter(linea => linea.trim() !== '').map(linea => {
            const textoLimpio = linea.trim().replace(/^[-*d.]+\s*/, '');
            return `
                <div class="d-flex align-items-start mb-2 report-text-line" style="margin-left: 28px;">
                    <span class="text-muted me-2" style="font-size: 0.9rem; color: #94a3b8 !important;">•</span>
                    <p class="m-0 text-secondary" style="font-size: 0.91rem; line-height: 1.5; color: #334155 !important;">${textoLimpio}</p>
                </div>
            `;
        }).join('');
    },

    renderizar: () => {
        const contenedor = document.getElementById('sheet-preview-container');
        if (!contenedor) return;

        const datosInforme = appState.resumenInformeData;
        const datosPartido = appState.partidoData || {}; 

        if (!datosInforme) {
            contenedor.innerHTML = `
                <div class="text-center p-5 text-danger bg-white rounded border">
                    <h5>⚠️ Archivo "resumen_informe.json" no detectado</h5>
                    <p class="small text-muted mb-0">Por favor, asegúrate de subir una carpeta o ZIP que contenga este informe.</p>
                </div>`;
            return;
        }

        const metaInforme = datosInforme.partido_metadata || {};
        const local = datosPartido.local || metaInforme.local || 'Barcelona';
        const visitante = datosPartido.visitante || metaInforme.visitante || 'Real Madrid';
        const jornadaNum = datosPartido.jornada || metaInforme.jornada;
        const jornadaTexto = jornadaNum ? ` — Jornada ${jornadaNum}` : '';

        let fechaMostrar = datosPartido.fecha || metaInforme.fecha;
        if (fechaMostrar) {
            const partes = fechaMostrar.split('-');
            if (partes.length === 3) {
                fechaMostrar = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        } else {
            fechaMostrar = '10/05/2026';
        }

        const horaTexto = datosPartido.hora ? ` | ${datosPartido.hora}` : ' | 21:00';

        // --- CONSTRUCCIÓN DEL DOSSIER CON MAQUETACIÓN MULTIPÁGINA ---
        let html = `
        <div class="p-5 bg-white rounded shadow-sm border border-slate-100 style-dossier" style="color: #0f172a; max-width: 1100px; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif;">
            <table style="width: 100%; border-collapse: collapse; background: transparent;">
                
                <thead>
                    <tr class="print-spacer-row">
                        <td></td>
                    </tr>
                    <tr>
                        <td>
                            <div class="report-header-print-block">
                                <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary-subtle">
                                    <div class="d-flex align-items-center gap-3">
                                        <img src="img/logo.png" alt="Logo LDRV PRO" height="48" onerror="this.style.display='none'">
                                        <div>
                                            <h4 class="m-0 fw-black tracking-tight" style="color: #0f172a; font-size: 1.35rem; letter-spacing: -0.7px; text-transform: uppercase;">
                                                LDRV PRO - <span class="fw-light text-muted" style="font-weight: 300; color: #64748b;">ANALISIS</span>
                                            </h4>
                                            <small class="text-success fw-bold text-uppercase d-block mt-0.5" style="font-size: 0.72rem; letter-spacing: 1.2px;">Freelance Football Data & Game Analyst</small>
                                        </div>
                                    </div>
                                    <div class="text-end">
                                        <span class="fw-bold tracking-wider" style="font-size: 0.7rem; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">Documento Oficial</span>
                                        <small class="text-muted d-block" style="font-size: 0.65rem;">ANÁLISIS MODELO JUEGO</small>
                                    </div>
                                </div>

                                <div class="row g-2 mb-4 p-3 rounded" style="font-size: 0.85rem; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                                    <div class="col-8">
                                        <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem; letter-spacing: 0.5px;">Encuentro / Competición</span>
                                        <strong class="text-dark" style="font-size: 1rem;">${local} vs ${visitante}${jornadaTexto}</strong>
                                    </div>
                                    <div class="col-4 text-md-end">
                                        <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem; letter-spacing: 0.5px;">Fecha y Hora Informe</span>
                                        <strong class="text-dark">${fechaMostrar}${horaTexto}</strong>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td>
                            <div class="report-body-content résumé-container">
        `;

        // 2.1. Introducción Global
        if (datosInforme.texto_inicial_global) {
            html += `
                                <div class="mb-5 report-section">
                                    <h5 class="fw-bold mb-3 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                        1. Introducción y Contexto General
                                        <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                    </h5>
                                    <div class="p-3.5 rounded-3" style="background-color: #f8fafc; border: 1px solid #f1f5f9;">
                                        ${resume.formatearTexto(datosInforme.texto_inicial_global)}
                                    </div>
                                </div>
            `;
        }

        // 2.2. Desglose Táctico por Categorías
        if (datosInforme.resumen_tactico) {
            html += `
                                <div class="mb-5 report-section">
                                    <h5 class="fw-bold mb-4 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                        2. Desglose Táctico por Categorías
                                        <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                    </h5>
            `;

            for (const [categoria, subcategorias] of Object.entries(datosInforme.resumen_tactico)) {
                let sectionTheme = { border: 'border-secondary-subtle', text: 'text-secondary', bg: 'bg-secondary-subtle' };
                
                if (categoria.toLowerCase().includes('fortaleza')) {
                    sectionTheme = { border: 'border-success-subtle', text: 'text-success', bg: 'bg-success-subtle' };
                } else if (categoria.toLowerCase().includes('debilidad')) {
                    sectionTheme = { border: 'border-danger-subtle', text: 'text-danger', bg: 'bg-danger-subtle' };
                } else if (categoria.toLowerCase().includes('general') || categoria.toLowerCase().includes('aspectos')) {
                    sectionTheme = { border: 'border-primary-subtle', text: 'text-primary', bg: 'bg-primary-subtle' };
                }

                html += `
                                    <div class="mb-4 rounded-3 overflow-hidden dossier-card">
                                        <div class="px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between ${sectionTheme.bg}" style="border-color: rgba(0,0,0,0.05) !important;">
                                            <span class="fw-extrabold text-uppercase ${sectionTheme.text}" style="font-size: 0.8rem; letter-spacing: 1px;">
                                                ${categoria}
                                            </span>
                                        </div>
                                        <div class="p-3 bg-white">
                `;

                for (const [bloqueNombre, bloqueContenido] of Object.entries(subcategorias)) {
                    html += `
                                            <div class="mb-4 last-mb-0 tactical-sub-block">
                                                <div class="d-flex align-items-center gap-2 mb-2">
                                                    <span style="font-size: 0.95rem;">⚽</span>
                                                    <h6 class="fw-bold text-dark m-0" style="font-size: 0.95rem; letter-spacing: -0.2px;">${bloqueNombre}</h6>
                                                </div>
                    `;

                    if (bloqueContenido.patrones_detectados && bloqueContenido.patrones_detectados.length > 0) {
                        html += `
                                                <div class="ms-4 mb-2">
                                                    <div class="d-flex flex-column gap-1.5">
                                                        ${bloqueContenido.patrones_detectados.map(p => `
                                                            <div class="d-flex align-items-start py-1.5 px-3 rounded-2 border" style="background-color: #fafafa; border-color: #f1f5f9 !important; font-size: 0.88rem;">
                                                                <span class="me-2 text-muted fw-bold" style="color: #94a3b8 !important;">•</span>
                                                                <span class="text-dark fw-medium">${p}</span>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                        `;
                    }

                    if (bloqueContenido.anotaciones_libres) {
                        html += `
                                                <div class="ms-4 p-2.5 rounded-2 border-start border-3" style="background-color: #fdfdfd; border-color: #cbd5e1 !important;">
                                                    ${resume.formatearTexto(bloqueContenido.anotaciones_libres)}
                                                </div>
                        `;
                    }

                    html += `                </div>`;
                }

                html += `
                                        </div>
                                    </div>
                `;
            }
            html += `                   </div>`;
        }

        // 2.3. Conclusiones y Cierre Global
        if (datosInforme.texto_final_global) {
            html += `
                                <div class="mb-2 report-section">
                                    <h5 class="fw-bold mb-3 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                        3. Conclusiones y Recomendaciones Finales
                                        <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                    </h5>
                                    <div class="p-3.5 rounded-3" style="background-color: #f8fafc; border: 1px solid #f1f5f9;">
                                        ${resume.formatearTexto(datosInforme.texto_final_global)}
                                    </div>
                                </div>
            `;
        }

        // --- CIERRE DE LAS ESTRUCTURAS INVISIBLES DE CONTROL ---
        html += `
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div> `;

        contenedor.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    resume.init();
});