// js/shots.js

const shots = {
    // Medidas oficiales FIFA en metros
    anchoPorteriaMetros: 7.32,
    altoPorteriaMetros: 2.44,
    escalaPixelsPorMetro: 80, 

    /**
     * Inicializa el módulo de tiros adaptando y limpiando el lienzo.
     */
    init: () => {
        const canvas = document.getElementById('shots-canvas');
        if (!canvas) return;

        canvas.width = window.plays ? plays.modelWidth : 900;
        canvas.height = window.plays ? plays.modelHeight : 500;

        console.log('%c⚽ Módulo Mapa de Tiros Inicializado', 'color: #10b981; font-weight: bold;');
    },

    /**
     * Orquesta la extracción de datos desde appState, aplica filtros cruzados y fuerza el redibujado.
     */
    dibujar: () => {
        const canvas = document.getElementById('shots-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Recuperar datos desde el estado globalizado de la app
        const datosRaw = appState.impactosPorteriaData || [];

        // Leer filtros activos en el DOM
        const filterPeriodo = document.getElementById('impactos-periodo-filter');
        const filterTipo = document.getElementById('impactos-tipo-filter');

        const periodoSeleccionado = filterPeriodo ? filterPeriodo.value : 'TODOS';
        const tipoSeleccionado = filterTipo ? filterTipo.value : 'TODOS';

        // ── FILTRADO CRUZADO AVANZADO (Periodo Y/O Tipo de Jugada) ──
        const listaFiltrada = datosRaw.filter(item => {
            const cumplePeriodo = (periodoSeleccionado === 'TODOS' || item.periodo === periodoSeleccionado);
            
            // Asumiendo que el campo en tu JSON se llama 'tipo_jugada' o 'tipo'
            const tipoItem = item.tipo_jugada || item.tipo || '';
            const cumpleTipo = (tipoSeleccionado === 'TODOS' || tipoItem === tipoSeleccionado);

            return cumplePeriodo && cumpleTipo;
        });

        // Renderizar en el lienzo arco e impactos
        const totalPintados = shots.renderizarImpactosPorteriaDirectos(canvas.width, canvas.height, ctx, listaFiltrada);

        // Actualizar el banner informativo de la interfaz con el doble feedback
        const banner = document.getElementById('impactos-info-banner');
        if (banner) {
            banner.innerHTML = `🎯 FILTROS ➔ PERIODO: <span class="text-white">${periodoSeleccionado}</span> | TIPO: <span class="text-white">${tipoSeleccionado}</span> | TIROS: <span class="text-white">${totalPintados}</span>`;
        }

        // 🔄 Sincronizar reactivamente la lista lateral cronológica con los datos filtrados
        if (typeof ui !== 'undefined' && ui.poblarListaCronologica) {
            ui.poblarListaCronologica(listaFiltrada);
        }
    },

    /**
     * Renderiza la portería de frente e impacta los tiros.
     */
    renderizarImpactosPorteriaDirectos: (width, height, ctx, listaImpactos) => {
        ctx.fillStyle = '#111827'; 
        ctx.fillRect(0, 0, width, height);

        const porteriaW = shots.anchoPorteriaMetros * shots.escalaPixelsPorMetro; 
        const porteriaH = shots.altoPorteriaMetros * shots.escalaPixelsPorMetro;  

        const xInicio = (width - porteriaW) / 2;
        const ySuelo = (height + porteriaH) / 2 + 40; 
        const yLarguero = ySuelo - porteriaH;

        shots.dibujarArcoEstandar(ctx, width, xInicio, yLarguero, porteriaW, porteriaH, ySuelo);

        let totalImpactos = 0;
        if (!listaImpactos || listaImpactos.length === 0) return 0;

        listaImpactos.forEach((impacto) => {
            if (!impacto.coordenadas) return;
            totalImpactos++;

            const porcAncho = impacto.coordenadas.x;
            const porcAlto = impacto.coordenadas.y;

            const impactoX = xInicio + (porcAncho / 100) * porteriaW;
            const impactoY = ySuelo - (porcAlto / 100) * porteriaH;

            const colorImpacto = impacto.periodo === '1P' ? '#10b981' : '#22d3ee';

            ctx.save();
            ctx.beginPath();
            ctx.arc(impactoX, impactoY, 13, 0, Math.PI * 2);
            ctx.strokeStyle = colorImpacto;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.restore();

            // Mantenemos firme el emoji del balón ⚽
            shots.dibujarMarcadorImpacto(ctx, impactoX, impactoY, colorImpacto, '⚽', 8.5);
        });

        return totalImpactos;
    },

    dibujarArcoEstandar: (ctx, canvasWidth, x, yLarguero, ancho, alto, ySuelo) => {
        ctx.save();

        // Línea de gol inferior
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, ySuelo);
        ctx.lineTo(canvasWidth - 10, ySuelo);
        ctx.stroke();

        // Sombreado interno
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(x, yLarguero, ancho, alto);
        
        // Malla
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        for (let i = x; i <= x + ancho; i += 20) {
            ctx.beginPath(); ctx.moveTo(i, yLarguero); ctx.lineTo(i, ySuelo); ctx.stroke();
        }
        for (let j = yLarguero; j <= ySuelo; j += 20) {
            ctx.beginPath(); ctx.moveTo(x, j); ctx.lineTo(x + ancho, j); ctx.stroke();
        }

        // Estructura postes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8; 
        ctx.lineCap = 'square';
        
        ctx.beginPath();
        ctx.moveTo(x, ySuelo);
        ctx.lineTo(x, yLarguero);
        ctx.lineTo(x + ancho, yLarguero);
        ctx.lineTo(x + ancho, ySuelo);
        ctx.stroke();

        // Rótulos
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '11px monospace';
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'center';
        ctx.fillText(`${shots.anchoPorteriaMetros}m (FIFA Standard)`, x + ancho / 2, yLarguero - 15);
        
        ctx.save();
        ctx.translate(x - 15, yLarguero + alto / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${shots.altoPorteriaMetros}m`, 0, 0);
        ctx.restore();

        ctx.restore();
    },

    dibujarMarcadorImpacto: (ctx, x, y, color, emoji, radio) => {
        ctx.beginPath();
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.closePath();

        if (emoji) {
            ctx.fillStyle = '#111827'; 
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, x, y);
        }
    }
};

// Escucha reactiva multiselector
document.addEventListener('DOMContentLoaded', () => {
    const filtrarYRedibujar = () => {
        // Corrección: Comprobamos si el canvas está renderizado o visible en el DOM sin depender de estilos en línea rígidos
        const canvas = document.getElementById('shots-canvas');
        if (typeof shots !== 'undefined' && canvas && canvas.offsetParent !== null) {
            shots.dibujar();
        }
    };

    const filterPeriodo = document.getElementById('impactos-periodo-filter');
    const filterTipo = document.getElementById('impactos-tipo-filter');

    if (filterPeriodo) filterPeriodo.addEventListener('change', filtrarYRedibujar);
    if (filterTipo) filterTipo.addEventListener('change', filtrarYRedibujar);
});