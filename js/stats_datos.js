// js/stats/stats_datos.js

const statsDatos = {
    render: function(container) {
        console.log("DEBUG: Renderizando módulo 'datos'.");
        
        const datos = appState.tomaDatos;
        if (!datos || datos.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-4">No hay datos para procesar.</p>';
            return;
        }

        // --- Procesamiento Jerárquico ---
        const resumen = datos.reduce((acc, item) => {
            const tipo = item.tipo_jugada || "Sin Tipo";
            if (!acc[tipo]) acc[tipo] = { total: 0, detalles: {}, comunes: {} };
            acc[tipo].total++;

            if (Array.isArray(item.detalle_botones)) {
                let nivelActual = acc[tipo].detalles;
                item.detalle_botones.forEach((btn, index) => {
                    if (!nivelActual[btn]) {
                        nivelActual[btn] = { _count: 0, _finalizados: 0, _sub: {} };
                    }
                    nivelActual[btn]._count++;
                    if (index === item.detalle_botones.length - 1) {
                        nivelActual[btn]._finalizados++;
                    }
                    nivelActual = nivelActual[btn]._sub;
                });
            }
            if (item.comun_seleccionado) {
                const c = item.comun_seleccionado;
                acc[tipo].comunes[c] = (acc[tipo].comunes[c] || 0) + 1;
            }
            return acc;
        }, {});

        const resumenArray = Object.entries(resumen).sort((a, b) => b[1].total - a[1].total);

        // --- Generación del HTML ---
        const datosPartido = appState.partidoData || {};
        
        let html = `<div class="style-dossier">`;

        html += `
            <div class="mt-3 d-flex justify-content-between align-items-center mb-4 px-2 no-print">
                <div class="status-badge-ldr mb-0">
                    <span data-i18n="stats.actions_analyzed">Acciones Analizadas</span>: <b>${datos.length}</b>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-success" onclick="statsDatos.exportarCSV()">📥 CSV</button>
                </div>
            </div>

            <div class="dossier-header-print">
                <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary-subtle">
                    <div class="d-flex align-items-center gap-3">
                        <img src="img/logo.png" alt="Logo" height="48" onerror="this.style.display='none'">
                        <div>
                            <h4 class="m-0 fw-black text-uppercase" style="font-size: 1.35rem; color: #0f172a;">LDRV PRO - ESTADÍSTICAS</h4>
                            <small class="text-success fw-bold text-uppercase d-block" style="font-size: 0.72rem;">Freelance Football Data & Game Analyst</small>
                        </div>
                    </div>
                </div>
                <div class="row g-2 mb-4 p-3 rounded" style="background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.85rem;">
                    <div class="col-8">
                        <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Encuentro</span>
                        <strong class="text-dark">${datosPartido.local || 'Local'} vs ${datosPartido.visitante || 'Visitante'}</strong>
                    </div>
                    <div class="col-4 text-end">
                        <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Fecha</span>
                        <strong class="text-dark">${new Date().toLocaleDateString()}</strong>
                    </div>
                </div>
            </div>
            
            <div class="row g-3">`;

        for (const [tipo, data] of resumenArray) {
            html += `
                <div class="col-md-6">
                    <div class="video-card-mini h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-success pb-2">
                            <span class="fw-bold text-uppercase" style="color: var(--ldr-green);">${tipo.replace(/_/g, ' ')}</span>
                            <span class="badge bg-success">${data.total}</span>
                        </div>
                        
                        <div class="stats-body">
                            <small class="text-dim d-block mb-2">DETALLE TÁCTICO</small>
                            ${Object.keys(data.detalles).length > 0 ? stats.renderDetalle(data.detalles) : '<small class="text-muted">Sin detalles</small>'}
                            
                            ${Object.keys(data.comunes).length > 0 ? `
                                <div class="mt-3 pt-2 border-top border-secondary">
                                    <small class="text-dim d-block mb-1">CONCEPTOS COMUNES</small>
                                    <ul class="list-unstyled mb-0">
                                        ${Object.entries(data.comunes).map(([c, count]) => `
                                            <li class="d-flex justify-content-between small" style="color: #10b981;">
                                                <span>${c}</span> <b>${count}</b>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div></div>';
        
        container.innerHTML = html;

        
        if (typeof translator !== 'undefined') {
            translator.applyTranslations();
        }
    },

    exportarCSV: function() {
        const p = appState.partidoData || {};
        const datos = appState.tomaDatos || [];

        const federacion = (p.federacion || 'RFEF').replace(/\s+/g, '_');
        const liga = (p.liga || 'Liga').replace(/\s+/g, '_');
        const jornada = (p.jornada || '0').replace(/\s+/g, '_');
        const fecha = (p.fecha || '0000-00-00').replace(/\//g, '-');
        const local = (p.local || 'Local').replace(/\s+/g, '_');
        const visitante = (p.visitante || 'Visitante').replace(/\s+/g, '_');
        const hora = (p.hora || '00-00').replace(/:/g, '-');
        const equipoAnalizado = (p.equipo_analizado || 'Equipo').replace(/\s+/g, '_');

        const nombreArchivo = `datos_${federacion}_${liga}_${jornada}_${fecha}_${local}_${visitante}_${hora}_ANA_${equipoAnalizado}.csv`;
        const equipoAnalizadoLabel = `_ANA_${p.equipo_analizado || 'desconocido'}`;

        let csv = "Federacion,Liga,Jornada,Fecha_Partido,Equipo_Local,Equipo_Visitante,Hora,Equipo_Analizado,Tipo_Jugada,Detalle_Botones,Comun_Seleccionado\n";

        datos.forEach(item => {
            const detalles = Array.isArray(item.detalle_botones) ? item.detalle_botones.join(' > ') : '';
            const comun = item.comun_seleccionado || '';

            csv += `"${p.federacion || ''}","${p.liga || ''}","${p.jornada || ''}","${p.fecha || ''}",` +
                   `"${p.local || ''}","${p.visitante || ''}","${p.hora || ''}","${p.equipo_analizado || ''}",` +
                   `"${item.tipo_jugada || ''}","${detalles}","${comun}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
    }
};

if (typeof stats !== 'undefined') stats.registrar('datos', statsDatos);