const reportEngine = {
    // Función centralizada para formatear los bloques de texto
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

    // Motor recursivo para el desglose táctico
    procesarNivelTactico: (objeto, profundidad = 1) => {
        let subHtml = '';

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
                        ${reportEngine.formatearTexto(objeto.anotaciones_libres)}
                    </div>`;
            }
            return subHtml;
        }

        if (objeto && typeof objeto === 'object') {
            for (const [clave, valor] of Object.entries(objeto)) {
                if (profundidad === 1) {
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
                                ${reportEngine.procesarNivelTactico(valor, profundidad + 1)}
                            </div>
                        </div>`;
                } else if (profundidad === 2) {
                    subHtml += `
                        <div class="mb-3.5 report-subphase-block">
                            <h6 class="fw-bold text-dark border-bottom pb-1 mb-2.5" style="font-size: 0.95rem; color: #1e293b !important; letter-spacing: -0.2px;">
                                🛡️ ${clave}
                            </h6>
                            ${reportEngine.procesarNivelTactico(valor, profundidad + 1)}
                        </div>`;
                } else {
                    const marginCalculado = Math.min(20 + (profundidad - 3) * 12, 50);
                    subHtml += `
                        <div class="mb-3" style="margin-left: ${marginCalculado}px;">
                            <div class="d-flex align-items-center gap-1.5 mb-2">
                                <span class="badge bg-light text-slate-600 border border-slate-200" style="font-size: 0.74rem; font-weight: 600; color: #475569; background-color: #f8fafc; padding: 3px 8px;">
                                    ${clave}
                                </span>
                            </div>
                            ${reportEngine.procesarNivelTactico(valor, profundidad + 1)}
                        </div>`;
                }
            }
        }
        return subHtml;
    },

    // Render principal
    render: (contenedor, data) => {
        const { context, sections } = data;
        let html = `
        <div class="p-5 bg-white rounded shadow-sm border border-slate-100 style-dossier" style="color: #0f172a; max-width: 1100px; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif;">
            <table style="width: 100%; border-collapse: collapse; background: transparent;">
                <thead>
                    <tr><td><div class="report-header-print-block">
                        <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary-subtle">
                            <div class="d-flex align-items-center gap-3">
                                <img src="img/logo.png" alt="Logo" height="48" onerror="this.style.display='none'">
                                <div>
                                    <h4 class="m-0 fw-black tracking-tight" style="color: #0f172a; font-size: 1.35rem; letter-spacing: -0.7px; text-transform: uppercase;">${context.title}</h4>
                                    <small class="text-success fw-bold text-uppercase d-block mt-0.5" style="font-size: 0.72rem; letter-spacing: 1.2px;">${context.subtitle}</small>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="fw-bold tracking-wider" style="font-size: 0.7rem; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">${context.docType}</span>
                                <small class="text-muted d-block" style="font-size: 0.65rem;">${context.docCategory}</small>
                            </div>
                        </div>
                        <div class="row g-2 mb-4 p-3 rounded" style="font-size: 0.85rem; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                            <div class="col-8">
                                <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem; letter-spacing: 0.5px;">Encuentro / Competición</span>
                                <strong class="text-dark" style="font-size: 1rem;">${context.local} vs ${context.visitante} ${context.jornada ? '— Jornada ' + context.jornada : ''}</strong>
                            </div>
                            <div class="col-4 text-md-end">
                                <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem; letter-spacing: 0.5px;">Fecha y Hora Informe</span>
                                <strong class="text-dark">${context.fecha} | ${context.hora}</strong>
                            </div>
                        </div>
                    </div></td></tr>
                </thead>
                <tbody>
                    <tr><td><div class="report-body-content résumé-container">
                        ${sections.map(s => `
                            <div class="mb-5 report-section" ${s.pageBreak ? 'style="page-break-before: always;"' : ''}>
                                <h5 class="fw-bold mb-3 pb-1 text-dark position-relative" style="font-size: 1.1rem; letter-spacing: -0.3px;">
                                    ${s.title}
                                    <span class="position-absolute bottom-0 start-0 bg-success rounded" style="width: 35px; height: 3px;"></span>
                                </h5>
                                ${s.type === 'tactical' 
                                    ? reportEngine.renderStatsGrid(s.data) 
                                    : `<div class="p-3.5 rounded-3" style="background-color: #f8fafc; border: 1px solid #f1f5f9;">${reportEngine.formatearTexto(s.content)}</div>`}
                            </div>
                        `).join('')}
                    </div></td></tr>
                </tbody>
            </table>
        </div>`;
        contenedor.innerHTML = html;
    },

    renderListaJerarquica: (detalle) => {
        let html = '<ul class="list-unstyled ps-3 mb-1">';
        for (const [key, value] of Object.entries(detalle)) {
            const count = value._count || 0;
            const subKeys = Object.keys(value._sub || {});
            const hasSub = subKeys.length > 0;
            
            html += `
                <li class="mb-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="${hasSub ? 'text-dark fw-bold' : 'text-secondary'} small">${key}</span>
                        <b class="text-success">${count}</b>
                    </div>
                    ${hasSub ? reportEngine.renderListaJerarquica(value._sub) : ''}
                </li>`;
        }
        html += '</ul>';
        return html;
    },

    renderStatsGrid: (resumen) => {
        let html = '<div class="row g-3">';
        // Aseguramos el orden igual que en stats.js
        Object.entries(resumen).sort((a,b) => b[1].total - a[1].total).forEach(([tipo, data]) => {
            html += `
                <div class="col-md-6">
                    <div class="video-card-mini h-100 p-3 bg-white border border-slate-100 rounded">
                        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-success pb-2">
                            <span class="fw-bold text-uppercase" style="color: var(--ldr-green);">${tipo.replace(/_/g, ' ')}</span>
                            <span class="badge bg-success">${data.total}</span>
                        </div>
                        ${reportEngine.renderListaJerarquica(data.detalles)}
                    </div>
                </div>`;
        });
        html += '</div>';
        return html;
    },

    renderHeader: (ctx) => `
        <div class="dossier-header-print">
            <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary-subtle">
                <div class="d-flex align-items-center gap-3">
                    <img src="img/logo.png" alt="Logo" height="48" onerror="this.style.display='none'">
                    <div>
                        <h4 class="m-0 fw-black text-uppercase" style="font-size: 1.35rem; color: #0f172a;">${ctx.title}</h4>
                        <small class="text-success fw-bold text-uppercase d-block" style="font-size: 0.72rem;">${ctx.subtitle}</small>
                    </div>
                </div>
                <div class="text-end">
                    <span class="fw-bold text-primary" style="font-size: 0.7rem; text-transform: uppercase;">${ctx.docType}</span>
                </div>
            </div>
            <div class="row g-2 mb-4 p-3 rounded" style="background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.85rem;">
                <div class="col-8">
                    <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Encuentro</span>
                    <strong class="text-dark">${ctx.local} vs ${ctx.visitante}</strong>
                </div>
                <div class="col-4 text-end">
                    <span class="text-muted text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Fecha</span>
                    <strong class="text-dark">${ctx.fecha}</strong>
                </div>
            </div>
        </div>`

};