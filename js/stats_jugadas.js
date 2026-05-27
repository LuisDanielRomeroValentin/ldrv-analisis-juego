const statsJugadas = {
    filtro: 'Conducción',
    currentFilterAccion: 'Todos',
    currentFilterJugada: 'Todos',
    datosAudit: [],

    render: function(container) {
        this.datosAudit = appState.jugadasData || [];
        let html = `
            <div class="row">
                <div class="col-md-5">
                    <div class="mb-3">
                        <div class="btn-group w-100">
                            ${['Conducción', 'Tiro', 'Pase Largo'].map(tipo => `
                                <button class="btn btn-sm ${this.filtro === tipo ? 'btn-success' : 'btn-outline-secondary'}" 
                                        onclick="statsJugadas.setFiltro('${tipo}')">${tipo}</button>
                            `).join('')}
                        </div>
                    </div>
                    <div id="stats-map-container"></div>
                </div>
                <div class="col-md-7">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-warning">Auditoría en Tiempo Real</h6>
                        <button class="btn btn-sm btn-outline-warning" onclick="statsJugadas.exportarCSV()">📥 CSV</button>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <select class="form-select form-select-sm bg-dark text-white border-secondary" onchange="statsJugadas.updateFilters('accion', this.value)">
                                <option value="Todos">Todas las Acciones</option>
                                <option value="Pase Largo">Pase Largo</option>
                                <option value="Conducción">Conducción</option>
                                <option value="Tiro">Tiro</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <select class="form-select form-select-sm bg-dark text-white border-secondary" id="filter-jugada" onchange="statsJugadas.updateFilters('jugada', this.value)">
                                <option value="Todos">Todas las Fases</option>
                            </select>
                        </div>
                    </div>
                    <div style="max-height: 70vh; overflow-y: auto;">
                        <table class="table table-dark table-sm table-hover table-bordered small">
                            <thead style="position: sticky; top: 0; background: #212529;">
                                <tr><th>Min</th><th>Jugada</th><th>Tipo</th><th>Z.Ini</th><th>Z.Fin</th><th>Dist</th></tr>
                            </thead>
                            <tbody id="audit-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        const tipos = [...new Set(this.datosAudit.map(j => j.metadata.tipo_jugada))];
        const select = document.getElementById('filter-jugada');
        tipos.forEach(t => select.innerHTML += `<option value="${t}">${t.replace(/_/g, ' ')}</option>`);
        this.renderMapas(document.getElementById('stats-map-container'));
        this.renderFilasAudit();
    },

    updateFilters: function(type, value) {
        if (type === 'accion') this.currentFilterAccion = value;
        else this.currentFilterJugada = value;
        this.renderFilasAudit();
    },

    getZona: function(x, y) {
        const zona = x < 33.3 ? 1 : (x < 66.6 ? 2 : 3);
        let carril = 1;
        if (y >= 80) carril = 1;
        else if (y >= 60) carril = 2;
        else if (y >= 40) carril = 3;
        else if (y >= 20) carril = 4;
        else carril = 5;
        return `${carril}-${zona}`;
    },

    renderFilasAudit: function() {
        if (!this.datosAudit || !Array.isArray(this.datosAudit)) return;
        let lista = this.datosAudit.flatMap(j => 
            (j.acciones || []).filter(a => a.inicio).map(a => ({
                minuto: j.metadata.minuto,
                segundo: j.metadata.segundo,
                jugada: j.metadata.tipo_jugada,
                tipo: a.tipo,
                ini: a.inicio,
                fin: a.final,
                dist: a.final ? Math.sqrt(Math.pow(a.final.x - a.inicio.x, 2) + Math.pow(a.final.y - a.inicio.y, 2)) : 0
            }))
        );
        lista = lista.filter(item => {
            const isLargo = (item.tipo === 'Pase' && item.dist > 40);
            const tipoLabel = isLargo ? 'Pase Largo' : item.tipo;
            return (this.currentFilterAccion === 'Todos' || tipoLabel === this.currentFilterAccion) &&
                   (this.currentFilterJugada === 'Todos' || item.jugada === this.currentFilterJugada);
        });

        document.getElementById('audit-table-body').innerHTML = lista.map(item => `<tr>
            <td>${item.minuto}:${item.segundo}</td>
            <td>${item.jugada.substring(0, 15)}</td>
            <td>${item.tipo}</td>
            <td>${this.getZona(item.ini.x, item.ini.y)}</td>
            <td>${item.fin ? this.getZona(item.fin.x, item.fin.y) : '---'}</td>
            <td>${item.dist.toFixed(1)}</td>
        </tr>`).join('');
    },

    setFiltro: function(tipo) {
        this.filtro = tipo;
        this.render(document.getElementById('stats-content'));
    },

    renderMapas: function(container) {
        const datos = this.procesar(this.datosAudit);
        let html = '';
        Object.keys(datos).forEach(tipoJugada => {
            const data = datos[tipoJugada][this.filtro];
            if (!data) return;
            html += `
                <div class="card bg-dark border-secondary mb-4">
                    <div class="card-header text-success fw-bold text-uppercase">${tipoJugada.replace(/_/g, ' ')}</div>
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-3 justify-content-center">
                            ${Object.keys(data).map(m => `<div><div class="text-white text-center mb-2 fw-bold">${m}</div>${this.dibujarGrid(data[m])}</div>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html || '<p class="text-center text-muted p-4">No hay datos.</p>';
    },

    dibujarGrid: function(zonasData) {
        const datos = zonasData || {};
        const carriles = [1, 2, 3, 4, 5];
        const zonas = [1, 2, 3];
        const nombresCarriles = ['Lat.Izq', 'Int.Izq', 'Central', 'Int.Der', 'Lat.Der'];
        const nombresZonas = ['Def', 'Med', 'Ataq'];

        return `
            <div style="display: grid; grid-template-columns: 50px repeat(3, 40px); gap: 2px;">
                <div></div>
                ${nombresZonas.map(n => `<div style="font-size: 0.6rem; text-align: center; color: #94a3b8; font-weight: bold;">${n}</div>`).join('')}
                ${carriles.map((c, index) => `
                    <div style="font-size: 0.6rem; display: flex; align-items: center; color: #94a3b8; font-weight: bold;">${nombresCarriles[index]}</div>
                    ${zonas.map(z => {
                        const key = `${c}-${z}`;
                        const count = datos[key] || 0;
                        return `<div style="background: ${count > 0 ? `rgba(16, 185, 129, ${0.2 + (count/10)})` : '#1e293b'}; 
                                       padding: 5px; text-align: center; border: 1px solid #334155; font-size: 0.7rem; color: white;">${count}</div>`;
                    }).join('')}
                `).join('')}
            </div>
        `;
    },

    exportarCSV: function() {
        const p = appState.partidoData || {};
        
        // 1. Preparación de variables para el nombre y el contenido
        const federacion = (p.federacion || 'RFEF').replace(/\s+/g, '_');
        const liga = (p.liga || 'Liga').replace(/\s+/g, '_');
        const jornada = (p.jornada || '0').replace(/\s+/g, '_');
        const fecha = (p.fecha || '0000-00-00').replace(/\//g, '-');
        const local = (p.local || 'Local').replace(/\s+/g, '_');
        const visitante = (p.visitante || 'Visitante').replace(/\s+/g, '_');
        const hora = (p.hora || '00-00').replace(/:/g, '-');
        const equipoAnalizado = (p.equipo_analizado || 'Equipo').replace(/\s+/g, '_');

        // Construcción del nombre del archivo
        const nombreArchivo = `jugadas_${federacion}_${liga}_${jornada}_${fecha}_${local}_${visitante}_${hora}_ANA_${equipoAnalizado}.csv`;
        
        // Etiqueta para la columna "Info_Analisis"
        const equipoAnalizadoLabel = `_ANA_${p.equipo_analizado || 'desconocido'}`;
        
        // Cabeceras
        let csv = "Federacion,Liga,Jornada,Fecha_Partido,Equipo_Local,Equipo_Visitante,Hora,Equipo_Analizado," +
                  "Periodo,Minuto,Segundo,Tipo_Jugada,Tipo_Accion,X_Inicio,Y_Inicio,X_Final,Y_Final,Zona_Inicio,Zona_Fin,Distancia\n";
        
        this.datosAudit.forEach(j => {
            const m = j.metadata;
            
            j.acciones.forEach(a => {
                const dist = a.final ? Math.sqrt(Math.pow(a.final.x - a.inicio.x, 2) + Math.pow(a.final.y - a.inicio.y, 2)).toFixed(1) : 0;
                const zIni = this.getZona(a.inicio.x, a.inicio.y);
                const zFin = a.final ? this.getZona(a.final.x, a.final.y) : '---';
                
                csv += `"${p.federacion || ''}","${p.liga || ''}","${p.jornada || ''}","${p.fecha || ''}",` +
                       `"${p.local || ''}","${p.visitante || ''}","${p.hora || ''}","${p.equipo_analizado || ''}",` +
                       `"${m.periodo || ''}","${m.minuto || ''}","${m.segundo || ''}","${m.tipo_jugada || ''}",` +
                       `"${a.tipo || ''}","${a.inicio.x || ''}","${a.inicio.y || ''}",` +
                       `"${a.final ? a.final.x : ''}","${a.final ? a.final.y : ''}",` +
                       `"${zIni}","${zFin}","${dist}"\n`;
            });
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // AHORA SÍ: Usamos la variable nombreArchivo que definimos arriba
        a.download = nombreArchivo; 
        a.click();
    },

    procesar: function(datos) {
        const acc = {};
        datos.forEach(j => {
            const tipoJ = j.metadata.tipo_jugada || 'Sin Tipo';
            if (!acc[tipoJ]) {
                acc[tipoJ] = { 
                    'Conducción': { Inicio: {}, Fin: {} }, 
                    'Tiro': { Inicio: {} }, 
                    'Pase Largo': { Inicio: {}, Fin: {} },
                    'Pase': { Inicio: {}, Fin: {} } 
                };
            }
            j.acciones.forEach(a => {
                if (!a.inicio) return;
                const dist = a.final ? Math.sqrt(Math.pow(a.final.x - a.inicio.x, 2) + Math.pow(a.final.y - a.inicio.y, 2)) : 0;
                const tipoAccion = (a.tipo === 'Pase' && dist > 40) ? 'Pase Largo' : a.tipo;
                if (acc[tipoJ][tipoAccion]) {
                    const keyI = this.getZona(a.inicio.x, a.inicio.y);
                    acc[tipoJ][tipoAccion].Inicio[keyI] = (acc[tipoJ][tipoAccion].Inicio[keyI] || 0) + 1;
                    if (a.final && acc[tipoJ][tipoAccion].Fin) {
                        const keyF = this.getZona(a.final.x, a.final.y);
                        acc[tipoJ][tipoAccion].Fin[keyF] = (acc[tipoJ][tipoAccion].Fin[keyF] || 0) + 1;
                    }
                }
            });
        });
        return acc;
    }
};

if (typeof stats !== 'undefined') stats.registrar('jugadas', statsJugadas);