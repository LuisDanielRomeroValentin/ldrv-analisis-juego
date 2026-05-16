// js/ui.js
const ui = {

    initApp: () => {
        try {
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('main-menu').style.visibility = 'visible';
            const hamburger = document.getElementById('hamburger-btn');
            if (hamburger) hamburger.style.visibility = 'visible';

            const data = appState.partidoData;
            if (!data) throw new Error('No hay datos del partido');

            const infoText = `${data.local} vs ${data.visitante} | Jornada ${data.jornada}`;

            const infoEl = document.getElementById('partido-info');
            infoEl.innerText = infoText;
            infoEl.className = 'status-badge-ldr';

            const infoMobile = document.getElementById('partido-info-mobile');
            if (infoMobile) {
                infoMobile.innerText = infoText;
                infoMobile.style.display = 'inline-flex';
            }

            const datosApp = obtenerDatosApp();

            // Configuración Sección VÍDEOS BRUTOS
            ui.populateJugadaFilter(datosApp.hacer_cortes, 'tipo-jugada-filter');
            ui.filterAndRender(datosApp.hacer_cortes, 'container-brutos', 'tipo-jugada-filter');

            // Configuración Sección ANALIZADOS (Misma lógica)
            ui.populateJugadaFilter(datosApp.analizar_corte, 'filtro-analizados');
            ui.filterAndRender(datosApp.analizar_corte, 'container-analizados', 'filtro-analizados');

            // 📋 INICIALIZACIÓN MÓDULO JUGADAS TÁCTICAS
            // Si hay datos de jugadas cargados en el JSON, preparamos sus desplegables
            console.log("--- COMPROBACIÓN UI PARA JUGADAS ---");
            console.log("¿Existe el objeto plays?:", typeof plays !== 'undefined');
            console.log("¿Qué hay en appState.jugadasData en este momento?:", appState.jugadasData);

            if (typeof plays !== 'undefined' && appState.jugadasData && appState.jugadasData.length > 0) {
                console.log("✅ Condición superada. Inicializando Pizarra Táctica...");
                plays.init();
                plays.cargarTiposDisponibles();
            } else {
                console.warn("⚠️ No se inicializó la pizarra porque falló la condición del IF.");
            }

            const firstBtn = document.querySelector('#main-menu .nav-btn');
            ui.showSection('v-brutos');
            if (firstBtn) ui.setActiveBtn(firstBtn);

            console.log('%c✅ UI inicializada por completo', 'color:green;font-weight:bold');
        } catch (error) {
            console.error('❌ Error inicializando UI:', error);
            alert(`Error: ${error.message}`);
        }
    },

    setActiveBtn: (btn) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    },

    closeMobileMenu: () => {
        const mobileNav = document.getElementById('mobile-nav');
        const hamburger = document.getElementById('hamburger-btn');
        if (mobileNav) mobileNav.style.display = 'none';
        if (hamburger) hamburger.classList.remove('open');
    },

    // ── FILTRO GENÉRICO ──────────────────────────────────────────────

    populateJugadaFilter: (cortes, selectId) => {
        const select = document.getElementById(selectId);
        if (!select || !cortes || cortes.length === 0) return;

        const tipos = [...new Set(cortes.map(c => c.tipo_jugada || c.tipo || 'Sin clasificar'))].sort();

        select.innerHTML = '<option value="">Todas las jugadas</option>';
        tipos.forEach(tipo => {
            const opt = document.createElement('option');
            opt.value = tipo;
            const txt = tipo.replace(/_/g, ' ');
            opt.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
            select.appendChild(opt);
        });
    },

    filterAndRender: (cortesOriginal, containerId, filterId) => {
        const filterSelect = document.getElementById(filterId);
        if (!cortesOriginal) return;

        const filterValue = filterSelect ? filterSelect.value : '';

        const listaFiltrada = !filterValue
            ? cortesOriginal
            : cortesOriginal.filter(c => (c.tipo_jugada || c.tipo) === filterValue);

        ui.renderAgrupado(containerId, listaFiltrada);
    },

    // ── CARD ──────────────────────────────────────────────────────────

    _buildCard: (corte) => {
        const col = document.createElement('div');
        col.className = 'col';

        const minuto      = corte.minuto  || '0';
        const segundo     = corte.segundo || '00';
        const periodo     = corte.periodo || '—';
        const tipoLimpio  = (corte.tipo_jugada || corte.tipo || 'Accion').replace(/_/g, ' ');
        const tipoCapital = tipoLimpio.charAt(0).toUpperCase() + tipoLimpio.slice(1);
        const label       = `${tipoCapital} | ${minuto}:${segundo}`;

        const etiquetasHTML = (corte.etiquetas || [])
            .map(e => `<span class="etiqueta-badge">${e}</span>`).join('');
        const notasHTML = corte.notas
            ? `<p class="clip-notas">"${corte.notas}"</p>` : '';

        // Escapar rutas para JS
        const rutaSafe  = (corte.ruta_relativa || corte.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const labelSafe = label.replace(/'/g, "\\'");

        col.innerHTML = `
            <div class="video-card-mini h-100 d-flex flex-column justify-content-between">
                <div class="mb-3">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <small class="text-dim">Accion tactica</small>
                        <span class="periodo-badge">${periodo}</span>
                    </div>
                    <span class="clip-time fw-bold d-block mb-1">${label}</span>
                    ${etiquetasHTML ? `<div class="d-flex flex-wrap gap-1 mb-1">${etiquetasHTML}</div>` : ''}
                    ${notasHTML}
                </div>
                <button class="btn btn-primary w-100"
                    onclick="ui.playVideo('${rutaSafe}', '${labelSafe}')">
                    &#9654; VER CLIP
                </button>
            </div>
        `;
        return col;
    },

    // ── ACORDEÓN DE VALORACIÓN ───────────────────────────────────────

    _buildValoracionToggle: (valoracion, cortes) => {
        const cfg = {
            alta:  { titulo: '&#11088; Prioridad Alta',  clase: 'p-alta',  open: true  },
            media: { titulo: '&#128204; Prioridad Media', clase: 'p-media', open: false },
            baja:  { titulo: '&#128313; Prioridad Baja',  clase: 'p-baja',  open: false }
        };
        const { titulo, clase, open } = cfg[valoracion] || cfg.baja;

        const details = document.createElement('details');
        details.className = `group-accordion accordion-inner ${clase}`;
        if (open) details.open = true;

        const summary = document.createElement('summary');
        summary.innerHTML = `<strong>${titulo}</strong><span class="count">${cortes.length} clips</span>`;

        const grid = document.createElement('div');
        grid.className = 'row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4 py-3 px-3';
        cortes.forEach(c => grid.appendChild(ui._buildCard(c)));

        details.appendChild(summary);
        details.appendChild(grid);
        return details;
    },

    // ── RENDER PRINCIPAL AGRUPADO ────────────────────────────────────

    renderAgrupado: (containerId, lista) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (!lista || lista.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay cortes para mostrar</p>';
            return;
        }

        // 1. Agrupar por tipo de jugada
        const porTipo = {};
        lista.forEach(c => {
            const tipo = c.tipo_jugada || c.tipo || 'otros';
            if (!porTipo[tipo]) porTipo[tipo] = [];
            porTipo[tipo].push(c);
        });

        const tiposOrdenados = Object.keys(porTipo).sort();

        tiposOrdenados.forEach((tipo, idx) => {
            const cortesDelTipo = porTipo[tipo];
            const tipoLabel    = tipo.replace(/_/g, ' ');
            const tipoCapital  = tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1);

            const detailsTipo = document.createElement('details');
            detailsTipo.className = 'group-accordion accordion-tipo';
            if (idx === 0) detailsTipo.open = true;

            const summaryTipo = document.createElement('summary');
            summaryTipo.innerHTML = `
                <strong>&#128194; ${tipoCapital.toUpperCase()}</strong>
                <span class="count">${cortesDelTipo.length} clips</span>
            `;
            detailsTipo.appendChild(summaryTipo);

            // 2. Agrupar por valoración dentro del tipo
            const porVal = { alta: [], media: [], baja: [] };
            cortesDelTipo.forEach(c => {
                const v = c.prioridad || 'baja';
                (porVal[v] || porVal.baja).push(c);
            });

            const innerWrap = document.createElement('div');
            innerWrap.className = 'accordion-inner-wrap';

            ['alta', 'media', 'baja'].forEach(val => {
                if (porVal[val].length === 0) return;
                innerWrap.appendChild(ui._buildValoracionToggle(val, porVal[val]));
            });

            detailsTipo.appendChild(innerWrap);
            container.appendChild(detailsTipo);
        });
    },

    // ── SECCIONES ─────────────────────────────────────────────────────

    showSection: (sectionId) => {
        // Oculta todas las secciones con la clase común
        document.querySelectorAll('.app-section, .tab-content').forEach(s => s.style.display = 'none');
        
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'block';

        // 🛑 Seguridad táctica: si salimos de la pestaña de gráficos/jugadas, forzamos parar la animación activa
        if (sectionId !== 'jugadas-section' && typeof plays !== 'undefined' && plays.stopAnimacion) {
            plays.stopAnimacion();
        }
    },

    // ── VIDEO ─────────────────────────────────────────────────────────

    playVideo: async (ruta, titulo) => {
        console.log("--- INTENTO DE REPRODUCCIÓN ---");
        console.log("1. Ruta recibida en UI:", ruta);
        console.log("2. Título:", titulo);

        const url = await getFileAsset(ruta);
        
        if (!url) {
            console.error("3. ERROR: No se generó URL para el video. Ruta no encontrada en el sistema.");
            alert(`Error: No se encontró el archivo en la ruta: ${ruta}`);
            return;
        }

        console.log("3. ÉXITO: URL de objeto generada:", url);

        const player = document.getElementById('main-player');
        const titleEl = document.getElementById('video-title');

        titleEl.innerText = titulo;
        player.src = url;
        player.load();

        document.getElementById('video-modal').style.display = 'flex';
        
        player.play().then(() => {
            console.log("4. Reproducción iniciada correctamente");
        }).catch(e => {
            console.error("4. ERROR al reproducir el video:", e);
        });
    },

    closeVideo: () => {
        const player = document.getElementById('main-player');
        player.pause();
        player.src = '';
        document.getElementById('video-modal').style.display = 'none';
    }
};

// ── LISTENERS ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // Listener Filtro Brutos
    const filterBrutos = document.getElementById('tipo-jugada-filter');
    if (filterBrutos) {
        filterBrutos.addEventListener('change', () => {
            const datosApp = obtenerDatosApp();
            ui.filterAndRender(datosApp.hacer_cortes, 'container-brutos', 'tipo-jugada-filter');
        });
    }

    // Listener Filtro Analizados
    const filterAnalizados = document.getElementById('filtro-analizados');
    if (filterAnalizados) {
        filterAnalizados.addEventListener('change', () => {
            const datosApp = obtenerDatosApp();
            ui.filterAndRender(datosApp.analizar_corte, 'container-analizados', 'filtro-analizados');
        });
    }

    // 🛠️ Controladores del Menú de Navegación de Pestañas
    document.querySelectorAll('#main-menu .nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            ui.setActiveBtn(e.currentTarget);
            
            // Evaluamos a qué sección debe apuntar según el botón pulsado
            const btnId = e.currentTarget.id;
            if (btnId === 'btn-nav-brutos') {
                ui.showSection('v-brutos');
            } else if (btnId === 'btn-nav-analizados') {
                ui.showSection('v-analizados');
            } else if (btnId === 'btn-nav-jugadas') {
                ui.showSection('jugadas-section');
                // Al entrar de primeras, recalculamos el tamaño y repintamos el lienzo
                if (typeof plays !== 'undefined') {
                    plays.init();
                    plays.cargarTiposDisponibles();
                }
            }
        });
    });

    // Menú Hamburguesa
    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            const isOpen = hamburger.classList.toggle('open');
            mobileNav.style.display = isOpen ? 'flex' : 'none';
        });
    }
});

console.log('%c✅ ui.js cargado correctamente', 'color: green; font-weight: bold');