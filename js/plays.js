// js/plays.js

const plays = {
    canvas: null,
    ctx: null,
    animationId: null,
    
    listaFiltrada: [],      
    currentIndexInList: -1,  
    
    currentPlay: null,
    currentAccionIndex: 0,
    isPlaying: false,
    
    ballProgress: 0,         
    ballSpeed: 0.05, 

    modelWidth: 1000,
    modelHeight: 600,
    padding: 25, 

    historialJugadasPasadas: [],
    coloresAsignados: {},

    paletaClipsPasados: [
        '#38bdf8', // Clip 1: Azul Cyan Eléctrico
        '#fbbf24', // Clip 2: Ámbar / Amarillo intenso
        '#f87171', // Clip 3: Rojo Coral Intenso
        '#c084fc', // Clip 4: Violeta Neón
        '#f472b6', // Clip 5: Rosa
        '#2dd4bf', // Clip 6: Turquesa
        '#e2e8f0'  // Clip 7: Blanco grisáceo
    ],

    init: () => {
        plays.canvas = document.getElementById('field-canvas');
        if (!plays.canvas) return;
        plays.ctx = plays.canvas.getContext('2d');

        plays.canvas.width = plays.modelWidth;
        plays.canvas.height = plays.modelHeight;

        plays.setupControls();
        plays.dibujarCampo();
    },

    setupControls: () => {
        const btnPlay = document.getElementById('btn-play-animation');
        const btnPause = document.getElementById('btn-pause-animation');
        const btnReset = document.getElementById('btn-reset-animation');
        const selectType = document.getElementById('play-type-select');
        const selectFile = document.getElementById('play-file-select');
        const selectMode = document.getElementById('play-mode-select');
        const selectSpeed = document.getElementById('play-speed-select');
        const subVisualizacionSelect = document.getElementById('sub-visualizacion-select');

        if (btnPlay) btnPlay.onclick = plays.startAnimacion;
        if (btnPause) btnPause.onclick = plays.stopAnimacion;
        if (btnReset) btnReset.onclick = plays.resetAnimacion;

        if (selectSpeed) {
            selectSpeed.onchange = (e) => {
                plays.ballSpeed = parseFloat(e.target.value);
            };
        }

        if (subVisualizacionSelect) {
            subVisualizacionSelect.onchange = () => {
                plays.dibujarFrame();
            };
        }

        if (selectType) {
            selectType.onchange = (e) => {
                plays.stopAnimacion(); 
                plays.historialJugadasPasadas = [];
                plays.filtrarYOrdenarJugadas(e.target.value);
                
                const modoActual = selectMode ? selectMode.value : 'individual';
                
                if (modoActual === 'mapa-calor' || modoActual === 'red-pases' || modoActual === 'mapa-cuadrantes' || modoActual === 'inicio-fin') {
                    plays.dibujarFrame();
                }
            };
        }

        if (selectMode) {
            selectMode.onchange = (e) => {
                plays.stopAnimacion();
                plays.historialJugadasPasadas = [];
                
                const modo = e.target.value;
                
                // 🔒 CONTROL RIGUROSO DE VISIBILIDAD USANDO EL WRAPPER REAL DEL HTML
                const wrapperSub = document.getElementById('wrapper-sub-visualizacion');
                if (wrapperSub) {
                    if (modo === 'inicio-fin') {
                        wrapperSub.style.setProperty('display', 'block', 'important');
                    } else {
                        wrapperSub.style.setProperty('display', 'none', 'important');
                    }
                }

                // Control de ocultación de reproducción en barra inferior
                if (modo === 'mapa-calor' || modo === 'red-pases' || modo === 'mapa-cuadrantes' || modo === 'inicio-fin') {
                    plays.toggleControlesReproduccion(false);
                } else {
                    plays.toggleControlesReproduccion(true);  
                }
                
                if (modo === 'individual') {
                    if (selectFile) selectFile.style.display = 'inline-block';
                    document.getElementById('play-info-banner').style.display = 'none';
                } else {
                    if (selectFile) selectFile.style.display = 'none';
                    if (modo === 'secuencial-acumulado') {
                        plays.currentIndexInList = 0;
                        if (plays.listaFiltrada.length > 0) {
                            plays.cargarJugada(plays.listaFiltrada[0]);
                        }
                    }
                }
                plays.dibujarFrame();
            };
        }

        if (selectFile) {
            selectFile.onchange = (e) => {
                const idx = e.target.value;
                if (idx !== "") {
                    plays.currentIndexInList = parseInt(idx);
                    if (selectMode && selectMode.value !== 'secuencial-acumulado') {
                        plays.historialJugadasPasadas = [];
                    }
                    plays.cargarJugada(plays.listaFiltrada[plays.currentIndexInList]);
                } else {
                    plays.currentPlay = null;
                    plays.stopAnimacion();
                    plays.dibujarCampo();
                    plays.toggleBotonesControl(false);
                    document.getElementById('play-info-banner').style.display = 'none';
                }
            };
        }
    },

    getXYReal: (porcentajeX, porcentajeY) => {
        const interiorW = plays.modelWidth - (plays.padding * 2);
        const interiorH = plays.modelHeight - (plays.padding * 2);
        const x = plays.padding + (porcentajeX / 100) * interiorW;
        const yInvertida = 100 - porcentajeY; 
        const y = plays.padding + (yInvertida / 100) * interiorH;
        return { x, y };
    },

    getColorPorClip: (index) => {
        const i = index < 0 ? 0 : index;
        return plays.paletaClipsPasados[i % plays.paletaClipsPasados.length];
    },

    cargarTiposDisponibles: () => {
        const selectType = document.getElementById('play-type-select');
        if (!selectType || !appState.jugadasData) return;

        const tipos = [...new Set(appState.jugadasData.map(j => {
            return j.metadata ? (j.metadata.tipo_jugada || j.metadata.tipo) : 'Acción';
        }))].sort();
        
        selectType.innerHTML = '<option value="">Todos los tipos...</option>';
        tipos.forEach(tipo => {
            const opt = document.createElement('option');
            opt.value = tipo;
            const txt = tipo.replace(/_/g, ' ').toUpperCase();
            opt.textContent = txt;
            selectType.appendChild(opt);
        });

        plays.filtrarYOrdenarJugadas(selectType.value || "");
    },

    filtrarYOrdenarJugadas: (tipo) => {
        const selectFile = document.getElementById('play-file-select');
        const selectMode = document.getElementById('play-mode-select');
        if (!selectFile || !appState.jugadasData) return;

        let filtradas = appState.jugadasData.filter(j => {
            const t = j.metadata ? (j.metadata.tipo_jugada || j.metadata.tipo || 'Acción') : 'Acción';
            return !tipo || t === tipo;
        });

        filtradas.sort((a, b) => {
            const metaA = a.metadata || {};
            const metaB = b.metadata || {};
            const perA = (metaA.periodo || '1P').toUpperCase() === '2P' ? 2 : 1;
            const perB = (metaB.periodo || '1P').toUpperCase() === '2P' ? 2 : 1;
            if (perA !== perB) return perA - perB;
            const minA = parseInt(metaA.minuto || 0);
            const minB = parseInt(metaB.minuto || 0);
            if (minA !== minB) return minA - minB;
            return parseInt(metaA.segundo || 0) - parseInt(metaB.segundo || 0);
        });

        plays.listaFiltrada = filtradas;
        plays.currentIndexInList = -1;

        selectFile.innerHTML = '<option value="">Selecciona una jugada...</option>';
        plays.listaFiltrada.forEach((jugada, index) => {
            const meta = jugada.metadata || {};
            const min = meta.minuto || '00';
            const seg = meta.segundo || '00';
            const per = meta.periodo || '1P';
            
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `⏱️ [${per} - ${min}:${seg}]`;
            selectFile.appendChild(opt);
        });

        selectFile.disabled = plays.listaFiltrada.length === 0;

        if (plays.listaFiltrada.length > 0 && selectMode && (selectMode.value === 'individual' || selectMode.value === 'secuencial-acumulado')) {
            plays.toggleBotonesControl(true);
        }
    },

    actualizarBannerInfo: (personalizado = null) => {
        const banner = document.getElementById('play-info-banner');
        if (!banner) return;

        if (personalizado) {
            banner.innerHTML = personalizado;
            banner.style.display = 'block';
            return;
        }

        if (!plays.currentPlay) return;
        const meta = plays.currentPlay.metadata || {};
        const tipo = (meta.tipo_jugada || 'Acción').replace(/_/g, ' ');
        
        banner.innerHTML = `🎥 PLAYLIST ACTIVA: REPRODUCIENDO <span class="text-white">${tipo.toUpperCase()}</span> | TIEMPO TÁCTICO: <span class="text-white">${meta.periodo || '1P'} - Min. ${meta.minuto || '00'}:${meta.segundo || '00'}</span>`;
        banner.style.display = 'block';
    },

    cargarJugada: (jugada) => {
        plays.currentPlay = jugada;
        plays.currentAccionIndex = 0;
        plays.ballProgress = 0;

        plays.actualizarBannerInfo();
        plays.dibujarFrame();
    },

    toggleBotonesControl: (activar) => {
        ['btn-play-animation', 'btn-pause-animation', 'btn-reset-animation'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !activar;
        });
    },

    toggleControlesReproduccion: (visible) => {
        const contenedor = document.getElementById('playback-controls-container');
        if (contenedor) {
            contenedor.style.display = visible ? 'flex' : 'none'; 
        } else {
            const elementos = ['btn-play-animation', 'btn-pause-animation', 'btn-reset-animation', 'play-speed-select'];
            elementos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = visible ? 'inline-block' : 'none';
            });
        }
    },

    startAnimacion: () => {
        const modoSelect = document.getElementById('play-mode-select');
        const modo = modoSelect ? modoSelect.value : 'individual';
        
        if (modo === 'mapa-calor' || modo === 'red-pases' || modo === 'mapa-cuadrantes' || modo === 'inicio-fin') return;

        if (modo === 'secuencial-acumulado' && plays.currentIndexInList === -1) {
            plays.currentIndexInList = 0;
            if (plays.listaFiltrada.length > 0) plays.cargarJugada(plays.listaFiltrada[0]);
        }

        if (!plays.currentPlay || plays.isPlaying) return;
        plays.isPlaying = true;
        plays.animarLoop();
    },

    stopAnimacion: () => {
        plays.isPlaying = false;
        if (plays.animationId) {
            cancelAnimationFrame(plays.animationId);
            plays.animationId = null;
        }
    },

    resetAnimacion: () => {
        plays.stopAnimacion();
        plays.currentAccionIndex = 0;
        plays.ballProgress = 0;
        plays.historialJugadasPasadas = [];
        
        const modoSelect = document.getElementById('play-mode-select');
        const modo = modoSelect ? modoSelect.value : 'individual';
        
        if (modo === 'secuencial-acumulado') {
            plays.currentIndexInList = 0;
            if (plays.listaFiltrada.length > 0) plays.cargarJugada(plays.listaFiltrada[0]);
        } else {
            plays.dibujarFrame();
        }
    },

    animarLoop: () => {
        if (!plays.isPlaying || !plays.currentPlay) return;

        plays.dibujarFrame();

        const acciones = plays.currentPlay.acciones || [];
        const modoSelect = document.getElementById('play-mode-select');
        const modo = modoSelect ? modoSelect.value : 'individual';

        if (acciones.length > 0 && plays.currentAccionIndex < acciones.length) {
            plays.ballProgress += plays.ballSpeed;
            if (plays.ballProgress >= 1) {
                plays.ballProgress = 0;
                plays.currentAccionIndex++;
            }
        } else {
            plays.stopAnimacion();
            
            if (modo === 'secuencial-acumulado') {
                plays.historialJugadasPasadas.push({
                    acciones: [...acciones],
                    clipIndex: plays.currentIndexInList
                });

                if (plays.currentIndexInList + 1 < plays.listaFiltrada.length) {
                    setTimeout(() => {
                        plays.currentIndexInList++;
                        plays.cargarJugada(plays.listaFiltrada[plays.currentIndexInList]);
                        plays.startAnimacion();
                    }, 1100);
                } else {
                    plays.actualizarBannerInfo(`✅ PLAYLIST COMPLETADA — TOTAL JUGADAS EVALUADAS: ${plays.listaFiltrada.length}`);
                }
            }
            return;
        }

        plays.animationId = requestAnimationFrame(plays.animarLoop);
    },

    dibujarFrame: () => {
        const modoSelect = document.getElementById('play-mode-select');
        const modo = modoSelect ? modoSelect.value : 'individual';

        // 🛡️ SALVAGUARDA REACTIVA USANDO EL WRAPPER REAL
        const wrapperSub = document.getElementById('wrapper-sub-visualizacion');
        if (wrapperSub) {
            if (modo === 'inicio-fin') {
                wrapperSub.style.setProperty('display', 'block', 'important');
            } else {
                wrapperSub.style.setProperty('display', 'none', 'important');
            }
        }

        const renderParams = {
            w: plays.modelWidth,
            h: plays.modelHeight,
            p: plays.padding,
            actualizarBanner: plays.actualizarBannerInfo,
            dibujarCampo: plays.dibujarCampo
        };

        if (modo === 'mapa-calor') {
            playsRenderers.renderizarMapaCalorCuadrícula(plays.ctx, plays.listaFiltrada, renderParams, plays.getXYReal);
            return;
        }
        if (modo === 'mapa-cuadrantes') {
            playsRenderers.renderizarMapaCuadrantes(plays.ctx, plays.listaFiltrada, renderParams);
            return;
        }
        if (modo === 'red-pases') {
            plays.renderizarRedPasesSecuencial();
            return;
        }
        if (modo === 'inicio-fin') {
            plays.renderizarRedPasesSecuencial();
            return;
        }

        plays.dibujarCampo();

        const colorClipActual = (modo === 'individual') ? '#CCFF00' : plays.getColorPorClip(plays.currentIndexInList);

        if (modo === 'secuencial-acumulado') {
            plays.historialJugadasPasadas.forEach(historial => {
                const colorHistorial = plays.getColorPorClip(historial.clipIndex);
                historial.acciones.forEach(acc => {
                    plays.dibujarCaminoAccion(acc, colorHistorial, 2, true);
                });
            });
        }

        if (!plays.currentPlay || !plays.currentPlay.acciones) return;

        const acciones = plays.currentPlay.acciones;

        for (let i = 0; i < plays.currentAccionIndex; i++) {
            plays.dibujarCaminoAccion(acciones[i], colorClipActual, 2.5, false);
        }

        const accionActual = acciones[plays.currentAccionIndex];
        if (accionActual) {
            plays.dibujarCaminoAccion(accionActual, colorClipActual, 4.5, false);

            const pIni = plays.getXYReal(accionActual.inicio.x, accionActual.inicio.y);
            const pFin = plays.getXYReal(accionActual.final.x, accionActual.final.y);

            const ballX = pIni.x + (pFin.x - pIni.x) * plays.ballProgress;
            const ballY = pIni.y + (pFin.y - pIni.y) * plays.ballProgress;

            plays.dibujarEntidad(pIni.x, pIni.y, colorClipActual, `${plays.currentAccionIndex + 1}`, 12);
            plays.dibujarEntidad(ballX, ballY, '#ffffff', '', 7, '#000000');
        }
    },

    dibujarCaminoAccion: (accion, colorBase, grosor, esTranslúcido) => {
        const ctx = plays.ctx;
        const pIni = plays.getXYReal(accion.inicio.x, accion.inicio.y);
        const pFin = plays.getXYReal(accion.final.x, accion.final.y);
        
        ctx.strokeStyle = colorBase;
        ctx.globalAlpha = esTranslúcido ? 0.35 : 1.0; 
        ctx.lineWidth = grosor;
        ctx.setLineDash([]); 

        const tipoAccion = (accion.tipo || 'Pase').toLowerCase();

        if (tipoAccion === 'tiro' || tipoAccion === 'disparo' || tipoAccion === 'remate') {
            ctx.beginPath();
            ctx.setLineDash([3, 7]); 
            ctx.moveTo(pIni.x, pIni.y);
            ctx.lineTo(pFin.x, pFin.y);
            ctx.stroke();
        } 
        else if (tipoAccion === 'conducción' || tipoAccion === 'conduccion') {
            ctx.beginPath();
            const dx = pFin.x - pIni.x;
            const dy = pFin.y - pIni.y;
            const distancia = Math.sqrt(dx * dx + dy * dy);
            const angulo = Math.atan2(dy, dx);
            
            ctx.moveTo(pIni.x, pIni.y);
            const amplitudOnda = 4;
            const frecuenciaOnda = 0.25;
            
            for (let d = 0; d <= distancia; d += 2) {
                const rx = pIni.x + (d / distancia) * dx;
                const ry = pIni.y + (d / distancia) * dy;
                const offset = Math.sin(d * frecuenciaOnda) * amplitudOnda;
                const ox = rx - offset * Math.sin(angulo);
                const oy = ry + offset * Math.cos(angulo);
                ctx.lineTo(ox, oy);
            }
            ctx.stroke();
        } 
        else {
            ctx.beginPath();
            ctx.moveTo(pIni.x, pIni.y);
            ctx.lineTo(pFin.x, pFin.y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
    },

    renderizarRedPasesSecuencial: () => {
        plays.dibujarCampo();
        
        const modoSelect = document.getElementById('play-mode-select');
        const modo = modoSelect ? modoSelect.value : '';
        
        // 🟢 CAPTURAMOS EL SELECT CORRECTO DESDE EL DOM ACTUAL
        const subVisualizacionSelect = document.getElementById('sub-visualizacion-select');
        const subVista = subVisualizacionSelect ? subVisualizacionSelect.value : 'vectores'; 
        
        const tipoSelect = document.getElementById('play-type-select');
        const nombreFiltro = tipoSelect && tipoSelect.value ? tipoSelect.value.replace(/_/g, ' ').toUpperCase() : 'TODOS';

        if (plays.listaFiltrada.length === 0) {
            plays.actualizarBannerInfo(`📊 NO HAY PASES DISPONIBLES PARA EL FILTRO: ${nombreFiltro}`);
            return;
        }

        plays.listaFiltrada.forEach((jugada, idxClip) => {
            if (!jugada.acciones || jugada.acciones.length === 0) return;
            const colorDelClip = plays.getColorPorClip(idxClip);

            if (modo === 'inicio-fin') {
                const primeraAccion = jugada.acciones[0];
                const ultimaAccion = jugada.acciones[jugada.acciones.length - 1];

                const vectorGlobal = {
                    inicio: { x: primeraAccion.inicio.x, y: primeraAccion.inicio.y },
                    final: { x: ultimaAccion.final.x, y: ultimaAccion.final.y },
                    tipo: 'pase'
                };

                // 🛠️ MAPEADO DE OPCIONES REALES DEL FORMULARIO
                if (subVista === 'vectores') {
                    // Opción 1: Vectores de Progresión (Líneas completas)
                    plays.dibujarCaminoAccion(vectorGlobal, colorDelClip, 2.5, false);
                    const pIni = plays.getXYReal(vectorGlobal.inicio.x, vectorGlobal.inicio.y);
                    plays.dibujarEntidad(pIni.x, pIni.y, colorDelClip, `${idxClip + 1}`, 9);
                    
                    const pFin = plays.getXYReal(vectorGlobal.final.x, vectorGlobal.final.y);
                    plays.dibujarEntidad(pFin.x, pFin.y, '#ffffff', '', 3.5, colorDelClip);
                } 
                else if (subVista === 'puntos') {
                    // Opción 2: Puntos Duales (Dibujar origen y destino sin la línea en medio)
                    const pIni = plays.getXYReal(vectorGlobal.inicio.x, vectorGlobal.inicio.y);
                    const pFin = plays.getXYReal(vectorGlobal.final.x, vectorGlobal.final.y);
                    plays.dibujarEntidad(pIni.x, pIni.y, colorDelClip, `O${idxClip + 1}`, 10);
                    plays.dibujarEntidad(pFin.x, pFin.y, '#ffffff', `F${idxClip + 1}`, 10, colorDelClip);
                } 
                else if (subVista === 'transicion') {
                    // Opción 3: Matriz de Transición (Muestra vector traslúcido para no sobrecargar el mapa)
                    plays.dibujarCaminoAccion(vectorGlobal, colorDelClip, 1.5, true);
                    const pFin = plays.getXYReal(vectorGlobal.final.x, vectorGlobal.final.y);
                    plays.dibujarEntidad(pFin.x, pFin.y, colorDelClip, `${idxClip + 1}`, 9);
                }
            } else {
                // Mantiene el modo 'red-pases' intacto (secuencia completa por clip)
                jugada.acciones.forEach((acc, idxAccion) => {
                    plays.dibujarCaminoAccion(acc, colorDelClip, 2.5, false);
                    const pIni = plays.getXYReal(acc.inicio.x, acc.inicio.y);
                    plays.dibujarEntidad(pIni.x, pIni.y, colorDelClip, `${idxAccion + 1}`, 9);
                });
            }
        });

        // Banner informativo adaptado
        if (modo === 'inicio-fin') {
            const txtSub = subVista === 'vectores' ? 'VECTORES PROGRESIÓN' : (subVista === 'puntos' ? 'PUNTOS DUALES' : 'MATRIZ DE TRANSICIÓN');
            plays.actualizarBannerInfo(`🎯 RED INICIO-FIN (${txtSub}) — FILTRO: <span class="text-white">${nombreFiltro}</span> | CLIPS: ${plays.listaFiltrada.length}`);
        } else {
            plays.actualizarBannerInfo(`⛓️ RED DE PASES COMPUESTA — FILTRO: <span class="text-white">${nombreFiltro}</span> | CLIPS: ${plays.listaFiltrada.length}`);
        }
    },

    dibujarEntidad: (x, y, color, texto, radio, colorBorde = '#ffffff') => {
        const ctx = plays.ctx;
        ctx.beginPath();
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colorBorde;
        ctx.stroke();
        ctx.closePath();

        if (texto) {
            ctx.fillStyle = '#111827'; 
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(texto, x, y);
        }
    },

    dibujarCampo: () => {
        const ctx = plays.ctx;
        const w = plays.modelWidth;
        const h = plays.modelHeight;
        const p = plays.padding;

        ctx.fillStyle = '#225533'; 
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'; 
        ctx.lineWidth = 3.5; 
        
        const iW = w - (p * 2);
        const iH = h - (p * 2);

        ctx.strokeRect(p, p, iW, iH);

        ctx.beginPath();
        ctx.moveTo(w / 2, p);
        ctx.lineTo(w / 2, h - p);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        ctx.strokeRect(p, h / 2 - 130, 120, 260); 
        ctx.strokeRect(p, h / 2 - 55, 40, 110);   
        
        ctx.beginPath();
        ctx.arc(p + 90, h / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p + 90, h / 2, 60, -Math.PI/2.8, Math.PI/2.8);
        ctx.stroke();

        ctx.strokeRect(w - p - 120, h / 2 - 130, 120, 260); 
        ctx.strokeRect(w - p - 40, h / 2 - 55, 40, 110);    
        
        ctx.beginPath();
        ctx.arc(w - p - 90, h / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(w - p - 90, h / 2, 60, Math.PI - Math.PI/2.8, Math.PI + Math.PI/2.8);
        ctx.stroke();
    }
};