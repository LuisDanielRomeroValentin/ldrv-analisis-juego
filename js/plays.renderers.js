// js/plays.renderers.js

const playsRenderers = {
    /**
     * Renderiza la matriz cuantitativa táctica de ocupación en cuadrícula de 6x4.
     * Evalúa las zonas de inicio de cada acción y calcula frecuencias relativas.
     */
    renderizarMapaCuadrantes: (ctx, listaFiltrada, params) => {
        const { w, h, p, actualizarBanner, dibujarCampo } = params;
        dibujarCampo();

        const tipoSelect = document.getElementById('play-type-select');
        const nombreFiltro = tipoSelect && tipoSelect.value ? tipoSelect.value.replace(/_/g, ' ').toUpperCase() : 'TODOS';

        if (listaFiltrada.length === 0) {
            actualizarBanner(`📊 NO HAY DATOS PARA LA MATRIZ DE CUADRANTES DE: ${nombreFiltro}`);
            return;
        }

        const columnas = 6;
        const filas = 4;
        const matrizContadores = Array.from({ length: columnas }, () => Array(filas).fill(0));
        let totalPasesRegistrados = 0;

        listaFiltrada.forEach(jugada => {
            if (!jugada.acciones) return;
            jugada.acciones.forEach(acc => {
                if (!acc.inicio) return;
                // Forzar límites estrictos entre 0 y 99.9 para evitar desbordamiento de índices
                const rx = Math.max(0, Math.min(99.9, acc.inicio.x));
                const ry = Math.max(0, Math.min(99.9, acc.inicio.y));

                const cIdx = Math.floor(rx / (100 / columnas));
                const fIdx = Math.floor(ry / (100 / filas));

                if (cIdx >= 0 && cIdx < columnas && fIdx >= 0 && fIdx < filas) {
                    matrizContadores[cIdx][fIdx]++;
                    totalPasesRegistrados++;
                }
            });
        });

        // Encontrar la frecuencia máxima absoluta para la normalización del color
        let maxFrecuencia = 1;
        for (let c = 0; c < columnas; c++) {
            for (let f = 0; f < filas; f++) {
                if (matrizContadores[c][f] > maxFrecuencia) {
                    maxFrecuencia = matrizContadores[c][f];
                }
            }
        }

        const interiorW = w - (p * 2);
        const interiorH = h - (p * 2);
        const celdaW = interiorW / columnas;
        const celdaH = interiorH / filas;

        ctx.save();
        for (let c = 0; c < columnas; c++) {
            for (let f = 0; f < filas; f++) {
                const numPases = matrizContadores[c][f];
                const xReal = p + (c * celdaW);
                const fInvertida = (filas - 1) - f; // Inversión del eje Y táctico
                const yReal = p + (fInvertida * celdaH);

                if (numPases > 0) {
                    const ratio = numPases / maxFrecuencia;
                    let colorBase = '234, 112, 36';
                    let alfa = 0.15 + (ratio * 0.65);

                    if (ratio < 0.35) colorBase = '234, 112, 36';       // Carga Baja: Naranja templado
                    else if (ratio < 0.75) colorBase = '249, 70, 4';     // Carga Media: Naranja intenso
                    else colorBase = '180, 10, 10';                      // Zona Caliente: Rojo de alta densidad

                    ctx.fillStyle = `rgba(${colorBase}, ${alfa})`;
                    ctx.fillRect(xReal, yReal, celdaW, celdaH);

                    // Contraste tipográfico dinámico según saturación de fondo
                    ctx.fillStyle = ratio > 0.6 ? '#ffffff' : '#ccff00';
                    ctx.font = 'bold 18px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(numPases, xReal + (celdaW / 2), yReal + (celdaH / 2));
                }

                // Renderizado de las subdivisiones de la matriz cuantitativa
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.lineWidth = 1;
                ctx.strokeRect(xReal, yReal, celdaW, celdaH);
            }
        }
        ctx.restore();

        // 🟢 Repintado reglamentario superior de la pizarra táctica LDRV (Garantiza visibilidad de líneas)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(p, p, interiorW, interiorH);
        ctx.beginPath();
        ctx.moveTo(w / 2, p); ctx.lineTo(w / 2, h - p);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeRect(p, h / 2 - 130, 120, 260); ctx.strokeRect(p, h / 2 - 55, 40, 110);
        ctx.strokeRect(w - p - 120, h / 2 - 130, 120, 260); ctx.strokeRect(w - p - 40, h / 2 - 55, 40, 110);
        ctx.restore();

        actualizarBanner(`📊 MATRIZ 6x4 ACTIVA — FILTRO: <span class="text-white">${nombreFiltro}</span> | ACCIONES REGISTRADAS: ${totalPasesRegistrados}`);
    },

    /**
     * Renderiza el mapa térmico HD "Puro Fuego" mediante interpolación lineal de vectores.
     * Procesa trayectorias completas y superpone gradientes radiales aditivos.
     */
    renderizarMapaCalorCuadrícula: (ctx, listaFiltrada, params, getXYReal) => {
        const { w, h, p, actualizarBanner, dibujarCampo } = params;
        dibujarCampo();

        const tipoSelect = document.getElementById('play-type-select');
        const nombreFiltro = tipoSelect && tipoSelect.value ? tipoSelect.value.replace(/_/g, ' ').toUpperCase() : 'TODOS';

        if (listaFiltrada.length === 0) {
            actualizarBanner(`📊 NO HAY CLIPS PARA EL MAPA DE CALOR DE: ${nombreFiltro}`);
            return;
        }

        const tamañoResolucion = 15;
        const matrizDensidad = {};
        const listaPuntosA_Pintar = [];
        const xMinCampo = p, xMaxCampo = w - p, yMinCampo = p, yMaxCampo = h - p;
        const iW = w - (p * 2), iH = h - (p * 2);

        // Oscurecimiento base sutil sobre el césped para potenciar el contraste térmico
        ctx.save();
        ctx.fillStyle = 'rgba(0, 10, 5, 0.15)';
        ctx.fillRect(xMinCampo, yMinCampo, iW, iH);
        ctx.restore();

        // Procesar trayectorias e interpolar puntos intermedios a lo largo del camino
        listaFiltrada.forEach(jugada => {
            if (!jugada.acciones) return;
            jugada.acciones.forEach(acc => {
                const pIni = getXYReal(acc.inicio.x, acc.inicio.y);
                const pFin = getXYReal(acc.final.x, acc.final.y);
                const dx = pFin.x - pIni.x;
                const dy = pFin.y - pIni.y;
                const distancia = Math.sqrt(dx * dx + dy * dy);
                const pasos = Math.max(Math.floor(distancia / 4), 1);

                for (let i = 0; i <= pasos; i++) {
                    const t = i / pasos;
                    const interX = pIni.x + dx * t;
                    const interY = pIni.y + dy * t;

                    // Validar que el punto interpolado se encuentre dentro de las dimensiones del terreno de juego
                    if (interX >= xMinCampo && interX <= xMaxCampo && interY >= yMinCampo && interY <= yMaxCampo) {
                        listaPuntosA_Pintar.push({ x: interX, y: interY });
                        const col = Math.floor(interX / tamañoResolucion);
                        const fila = Math.floor(interY / tamañoResolucion);
                        const clave = `${col}_${fila}`;
                        matrizDensidad[clave] = (matrizDensidad[clave] || 0) + 1;
                    }
                }
            });
        });

        const frecuencias = Object.values(matrizDensidad);
        const maxFrecuencia = frecuencias.length > 0 ? Math.max(...frecuencias) : 1;

        ctx.save();
        ctx.beginPath();
        ctx.rect(xMinCampo, yMinCampo, iW, iH);
        ctx.clip(); // Limitar la fusión de pantallas estrictamente al interior del campo
        ctx.globalCompositeOperation = 'screen'; // Fusión aditiva para simular acumulación térmica luminosa
        const radioInfluencia = 45;

        listaPuntosA_Pintar.forEach(punto => {
            const col = Math.floor(punto.x / tamañoResolucion);
            const fila = Math.floor(punto.y / tamañoResolucion);
            const clave = `${col}_${fila}`;
            const pesoZona = matrizDensidad[clave] || 1;
            const ratio = pesoZona / maxFrecuencia;

            const grad = ctx.createRadialGradient(punto.x, punto.y, 0, punto.x, punto.y, radioInfluencia);

            if (ratio < 0.35) {
                // Baja intensidad - Brasa perimetral
                grad.addColorStop(0, 'rgba(234, 112, 36, 0.22)');
                grad.addColorStop(0.6, 'rgba(234, 112, 36, 0.04)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else if (ratio < 0.75) {
                // Intensidad media - Fuego central
                grad.addColorStop(0, 'rgba(249, 70, 4, 0.50)');
                grad.addColorStop(0.5, 'rgba(234, 112, 36, 0.15)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                // Núcleo térmico - Fusión blanca-roja extrema
                grad.addColorStop(0, 'rgba(200, 10, 10, 0.90)');
                grad.addColorStop(0.4, 'rgba(249, 70, 4, 0.35)');
                grad.addColorStop(0.8, 'rgba(234, 112, 36, 0.05)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(punto.x, punto.y, radioInfluencia, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // 🟢 Re-perfilado superior de líneas tácticas reglamentarias
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(p, p, iW, iH);
        ctx.beginPath(); ctx.moveTo(w / 2, p); ctx.lineTo(w / 2, h - p); ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fill();
        ctx.strokeRect(p, h / 2 - 130, 120, 260); ctx.strokeRect(p, h / 2 - 55, 40, 110);
        ctx.strokeRect(w - p - 120, h / 2 - 130, 120, 260); ctx.strokeRect(w - p - 40, h / 2 - 55, 40, 110);
        ctx.restore();

        actualizarBanner(`📊 MAPA DE CALOR PRO — FILTRO: <span class="text-white">${nombreFiltro}</span> | CLIPS COMPILADOS: ${listaFiltrada.length}`);
    }
};