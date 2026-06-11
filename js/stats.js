const stats = {
    renderDetalle: function(detalle) {
        let html = '<ul class="list-unstyled ps-3 mb-1">';
        for (const [key, value] of Object.entries(detalle)) {
            const count = value._count || 0;
            const hasSub = Object.keys(value._sub).length > 0;
            
            html += `
                <li class="mb-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="${hasSub ? 'text-white fw-bold' : 'text-dim'} small">
                            ${key}
                        </span>
                        <b class="text-success">${count}</b>
                    </div>
                    ${hasSub ? stats.renderDetalle(value._sub) : ''}
                </li>
            `;
        }
        html += '</ul>';
        return html;
    },

    renderizarEstadisticas: function() {
        console.log("DEBUG: renderizarEstadisticas llamado.");
        console.log("DEBUG: Contenido de appState.tomaDatos:", appState?.tomaDatos);
        
        if (!appState || !appState.tomaDatos || appState.tomaDatos.length === 0) {
            console.warn("DEBUG: renderizarEstadisticas abortado. Datos vacíos o no listos.");
            return;
        }
        
        const section = document.getElementById('stats');
        const container = document.getElementById('stats-content');
        
        if (section) section.style.display = 'block';
        if (!container) return;

        container.innerHTML = ''; 

        const datos = appState.tomaDatos; 
        if (!datos || datos.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-4">No hay datos para procesar.</p>';
            return;
        }

        // --- Procesamiento Jerárquico (Mantenemos tu lógica igual) ---
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

        // --- Generación del HTML con cabecera unificada ---
        const datosPartido = appState.partidoData || {};
        
        let html = `<div class="style-dossier">`;

        html += `
            <div class="mt-3 d-flex justify-content-between align-items-center mb-4 px-2 no-print">
                <div class="status-badge-ldr mb-0">
                    <span data-i18n="stats.actions_analyzed">Acciones Analizadas</span>: <b>${datos.length}</b>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-success" onclick="stats.exportarCSV()">📥 CSV</button>
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
                    <div class="text-end">
                        <span class="fw-bold text-primary" style="font-size: 0.7rem; text-transform: uppercase;">Documento Oficial</span>
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
                            <small class="text-dim d-block mb-2" data-i18n="stats.tactical_detail">DETALLE TÁCTICO</small>
                            ${Object.keys(data.detalles).length > 0 ? stats.renderDetalle(data.detalles) : '<small class="text-muted" data-i18n="stats.no_details">Sin detalles</small>'}
                            
                            ${Object.keys(data.comunes).length > 0 ? `
                                <div class="mt-3 pt-2 border-top border-secondary">
                                    <small class="text-dim d-block mb-1" data-i18n="stats.common_concepts">CONCEPTOS COMUNES</small>
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
        const datos = appState.tomaDatos;
        const infoPartido = appState.partidoData || {}; // Obtenemos los datos del partido
        
        if (!datos || datos.length === 0) return alert("No hay datos para exportar");

        // 1. Definimos la cabecera incluyendo los campos del partido
        let csvContent = "Fecha Partido,Local,Visitante,Tipo Jugada,Detalle,Comun Seleccionado,Minuto,Segundo,Periodo\n";

        datos.forEach(item => {
            const detalles = Array.isArray(item.detalle_botones) ? item.detalle_botones.join(' > ') : '';
            
            // 2. Preparamos la fila con los datos de contexto del partido
            const row = [
                infoPartido.fecha || new Date().toLocaleDateString(), // Si no hay fecha, usamos la de hoy
                `"${(infoPartido.local || 'Local').replace(/"/g, '""')}"`,
                `"${(infoPartido.visitante || 'Visitante').replace(/"/g, '""')}"`,
                item.tipo_jugada || 'Sin Tipo',
                `"${detalles.replace(/"/g, '""')}"`,
                item.comun_seleccionado || '',
                item.info_tiempo?.minuto || '',
                item.info_tiempo?.segundo || '',
                item.info_tiempo?.periodo || ''
            ].join(",");
            
            csvContent += row + "\n";
        });

        // 3. Creamos el enlace de descarga (usando Blob para evitar problemas con archivos grandes)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `stats_${(infoPartido.local || 'partido').replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-nav-stats') {
        stats.renderizarEstadisticas();
    }
});