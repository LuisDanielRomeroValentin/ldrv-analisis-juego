// js/resume.js

const resume = {
    init: () => {
        // Añadimos el botón de móvil por si acaso
        const botones = ['btn-nav-resumen', 'btn-nav-resumen-mobile'];
        
        botones.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    console.log(`🖱️ Botón ${id} clicado. Buscando datos...`);
                    
                    const datosActuales = appState.resumenInformeData;
                    if (!datosActuales) {
                        alert("Los datos del informe aún no se han procesado.");
                        return;
                    }

                    ui.showSection('v-resumen');
                    
                    // Ajuste clave para iOS: forzar visibilidad del contenedor
                    const contenedor = document.getElementById('sheet-preview-container');
                    if (contenedor) {
                        contenedor.style.display = 'block';
                        contenedor.style.opacity = '1';
                    }

                    setTimeout(() => {
                        resume.renderizar();
                    }, 150); // Ligeramente mayor para asegurar el cambio de DOM
                });
            }
        });
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
        if (!datosInforme) return;

        // 3. Preparación de variables de contexto
        const datosPartido = appState.partidoData || {}; 
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

        // 4. Construcción del HTML
        let html = `
        <div class="p-5 bg-white rounded shadow-sm border border-slate-100 style-dossier" style="color: #0f172a; max-width: 1100px; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif;">
            <table style="width: 100%; border-collapse: collapse; background: transparent;">
                <thead>
                    <tr class="print-spacer-row"><td></td></tr>
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
                            <div class="report-body-content résumé-container">`;

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
                                </div>`;
        }

        if (datosInforme.resumen_tactico) {
            html += `
                                <div class="mb-5 report-section">
                                    <h5 class="fw-bold mb-4 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                        2. Desglose Táctico por Categorías
                                        <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                    </h5>`;

            // FUNCIÓN RECURSIVA PARA N-NIVELES
            const procesarNivelTactico = (objeto, profundidad = 1) => {
                let subHtml = '';

                // Condición de parada: ¿Es el nodo final con los datos del análisis?
                if (objeto && (objeto.hasOwnProperty('patrones_detectados') || objeto.hasOwnProperty('anotaciones_libres'))) {
                    const tienePatrones = objeto.patrones_detectados && objeto.patrones_detectados.length > 0;
                    const tieneAnotaciones = objeto.anotaciones_libres && objeto.anotaciones_libres.trim() !== "";

                    if (tienePatrones) {
                        subHtml += `
                                        <div class="ms-4 mb-2">
                                            <div class="d-flex flex-column gap-1.5">
                                                ${objeto.patrones_detectados.map(p => `
                                                    <div class="d-flex align-items-start py-1.5 px-3 rounded-2 border" style="background-color: #fafafa; border-color: #f1f5f9 !important; font-size: 0.88rem;">
                                                        <span class="me-2 text-muted fw-bold" style="color: #94a3b8 !important;">•</span>
                                                        <span class="text-dark fw-medium">${p}</span>
                                                    </div>`).join('')}
                                            </div>
                                        </div>`;
                    }
                    if (tieneAnotaciones) {
                        subHtml += `
                                        <div class="ms-4 p-2.5 rounded-2 border-start border-3" style="background-color: #fdfdfd; border-color: #cbd5e1 !important;">
                                            ${resume.formatearTexto(objeto.anotaciones_libres)}
                                        </div>`;
                    }
                    return subHtml;
                }

                // Si no es el nodo final, seguimos bajando por las ramas del árbol JSON
                for (const [clave, valor] of Object.entries(objeto)) {
                    if (profundidad === 1) {
                        // Nivel Raíz (Fortalezas / Debilidades) -> Estilo Tarjeta Grande
                        let sectionTheme = { border: 'border-secondary-subtle', text: 'text-secondary', bg: 'bg-secondary-subtle' };
                        if (clave.toLowerCase().includes('fortaleza')) sectionTheme = { border: 'border-success-subtle', text: 'text-success', bg: 'bg-success-subtle' };
                        else if (clave.toLowerCase().includes('debilidad')) sectionTheme = { border: 'border-danger-subtle', text: 'text-danger', bg: 'bg-danger-subtle' };
                        else if (clave.toLowerCase().includes('general') || clave.toLowerCase().includes('aspectos')) sectionTheme = { border: 'border-primary-subtle', text: 'text-primary', bg: 'bg-primary-subtle' };

                        subHtml += `
                                    <div class="mb-4 rounded-3 overflow-hidden dossier-card">
                                        <div class="px-3 py-2.5 border-bottom d-flex align-items-center justify-content-between ${sectionTheme.bg}" style="border-color: rgba(0,0,0,0.05) !important;">
                                            <span class="fw-extrabold text-uppercase ${sectionTheme.text}" style="font-size: 0.8rem; letter-spacing: 1px;">${clave}</span>
                                        </div>
                                        <div class="p-3 bg-white">
                                            ${procesarNivelTactico(valor, profundidad + 1)}
                                        </div>
                                    </div>`;
                    } else if (profundidad === 2) {
                        // Segundo nivel (Fase Ofensiva / Defensiva...) -> Subtítulo elegante
                        subHtml += `
                                    <div class="mb-3.5 report-subphase-block">
                                        <h6 class="fw-bold text-dark border-bottom pb-1 mb-2.5" style="font-size: 0.95rem; color: #1e293b !important; letter-spacing: -0.2px;">
                                            🛡️ ${clave}
                                        </h6>
                                        ${procesarNivelTactico(valor, profundidad + 1)}
                                    </div>`;
                    } else {
                        // Para cualquier nivel intermedio extra (Nivel 3, 4, 5... N)
                        // Calculamos un margen dinámico a la izquierda según la profundidad para jerarquizar visualmente
                        const marginCalculado = Math.min(20 + (profundidad - 3) * 12, 50);
                        
                        subHtml += `
                                    <div class="mb-3" style="margin-left: ${marginCalculado}px;">
                                        <div class="d-flex align-items-center gap-1.5 mb-2">
                                            <span class="badge bg-light text-slate-600 border border-slate-200" style="font-size: 0.74rem; font-weight: 600; color: #475569; background-color: #f8fafc; padding: 3px 8px;">
                                                ${clave}
                                            </span>
                                        </div>
                                        ${procesarNivelTactico(valor, profundidad + 1)}
                                    </div>`;
                    }
                }

                return subHtml;
            };

            // Ejecutamos la función recursiva pasándole el objeto inicial
            html += procesarNivelTactico(datosInforme.resumen_tactico);
            html += `</div>`;
        }

        if (datosInforme.texto_final_global) {
            html += `
                                <div class="mb-2 report-section" style="page-break-before: always; break-before: page;">
                                    <h5 class="fw-bold mb-3 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                        3. Conclusiones y Recomendaciones Finales
                                        <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                    </h5>
                                    <div class="p-3.5 rounded-3" style="background-color: #f8fafc; border: 1px solid #f1f5f9;">
                                        ${resume.formatearTexto(datosInforme.texto_final_global)}
                                    </div>
                                </div>`;
        }

        html += `
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

        contenedor.innerHTML = html;
        
        // FORZADO DE REPAINT (Crucial para iOS)
        contenedor.style.display = 'none';
        contenedor.offsetHeight; // Truco técnico para forzar al navegador a recalcular
        contenedor.style.display = 'block';

        console.log("🎉 Renderizado completado.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    resume.init();
});