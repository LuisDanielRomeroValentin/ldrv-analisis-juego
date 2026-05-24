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
        const container = document.getElementById('stats-content');
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
        
        let html = `
            <div class="mt-3 d-flex justify-content-between align-items-center mb-4 px-2 no-print">
                <div class="status-badge-ldr mb-0">
                    Acciones Analizadas: <b>${datos.length}</b>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-success" onclick="stats.exportarCSV()">📥 CSV</button>
                    <button class="btn btn-sm btn-outline-info" onclick="window.print()">🖨️ PDF</button>
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
        html += '</div>';
        
        container.innerHTML = html;
    },

    exportarCSV: function() {
        const datos = appState.tomaDatos;
        if (!datos || datos.length === 0) return alert("No hay datos para exportar");

        let csvContent = "data:text/csv;charset=utf-8,Tipo Jugada,Detalle,Comun Seleccionado,Minuto,Segundo,Periodo\n";

        datos.forEach(item => {
            const detalles = Array.isArray(item.detalle_botones) ? item.detalle_botones.join(' > ') : '';
            const row = [
                item.tipo_jugada || 'Sin Tipo',
                `"${detalles}"`,
                item.comun_seleccionado || '',
                item.info_tiempo?.minuto || '',
                item.info_tiempo?.segundo || '',
                item.info_tiempo?.periodo || ''
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analisis_stats_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-nav-stats') {
        stats.renderizarEstadisticas();
    }
});