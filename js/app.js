const appState = {
    sourceType: null,
    zipContent: null,
    localFiles: [],
    allFilesFlat: [],
    partidoData: null,
    datosCortes: null,
    valoracionCortes: null,
    tomaDatos: null
};

console.log('%c📱 LDRV iniciado', 'color: green; font-weight: bold; font-size: 14px');

// === EVENT LISTENERS ===

document.getElementById('zip-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await processZip(file);
});

document.getElementById('folder-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    await processFolder(files);
});

// === PROCESAMIENTO ZIP ===

async function processZip(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        appState.zipContent = zip;
        appState.sourceType = 'zip';

        const pFileName = Object.keys(zip.files).find(f => f.endsWith("datos_partido.json"));
        const cFileName = Object.keys(zip.files).find(f => f.endsWith("datos_cortes.json"));
        const vFileName = Object.keys(zip.files).find(f => f.endsWith("valoraciones_cortes.json"));

        if (!pFileName) throw new Error('No se encontró datos_partido.json');
        if (!cFileName) throw new Error('No se encontró datos_cortes.json');
        if (!vFileName) throw new Error('No se encontró valoraciones_cortes.json');

        appState.partidoData      = JSON.parse(await zip.file(pFileName).async("string"));
        appState.datosCortes      = JSON.parse(await zip.file(cFileName).async("string"));
        appState.valoracionCortes = parseValoraciones(JSON.parse(await zip.file(vFileName).async("string")));

        appState.allFilesFlat = Object.keys(zip.files).map(path => ({
            path,
            name: path.split('/').pop(),
            folder: path.split('/')[0],
            isFile: !zip.files[path].dir
        }));

        ui.initApp();
    } catch (error) {
        console.error('❌ Error en ZIP:', error);
        showError(`Error procesando ZIP: ${error.message}`);
    }
}

// === PROCESAMIENTO CARPETA ===

async function processFolder(files) {
    try {
        appState.localFiles  = files;
        appState.sourceType  = 'folder';

        const pFile = files.find(f => f.name === "datos_partido.json");
        const cFile = files.find(f => f.name === "datos_cortes.json");
        const vFile = files.find(f => f.name === "valoraciones_cortes.json");

        if (!pFile) throw new Error('No se encontró datos_partido.json');
        if (!cFile) throw new Error('No se encontró datos_cortes.json');
        if (!vFile) throw new Error('No se encontró valoraciones_cortes.json');

        appState.partidoData  = JSON.parse(await pFile.text());
        appState.datosCortes  = JSON.parse(await cFile.text());
        appState.valoracionCortes = parseValoraciones(JSON.parse(await vFile.text()));

        appState.allFilesFlat = files.map(f => ({
            file: f,
            name: f.name,
            webkitPath: f.webkitRelativePath,
            folder: f.webkitRelativePath ? f.webkitRelativePath.split('/')[0] : ''
        }));

        ui.initApp();
    } catch (error) {
        console.error('❌ Error en carpeta:', error);
        showError(`Error procesando carpeta: ${error.message}`);
    }
}

// === OBTENER ARCHIVO COMO BLOB ===

async function getFileAsset(relativePath) {
    try {
        const cleanPath = relativePath.replace(/^\.[\\/]?/, '').replace(/\\/g, '/');

        if (appState.sourceType === 'zip') {
            let zipKey = Object.keys(appState.zipContent.files).find(k =>
                k.endsWith(cleanPath) || k === cleanPath
            );
            if (!zipKey) {
                const fileName = cleanPath.split('/').pop();
                zipKey = Object.keys(appState.zipContent.files).find(k =>
                    k.endsWith('/' + fileName) || k.endsWith(fileName)
                );
            }
            if (!zipKey) { console.warn('⚠️ No encontrado en ZIP:', cleanPath); return null; }
            const blob = await appState.zipContent.file(zipKey).async("blob");
            return URL.createObjectURL(blob);
        } else {
            const fileName = cleanPath.split('/').pop();
            const file = appState.allFilesFlat.find(f =>
                f.webkitPath?.endsWith(cleanPath) ||
                f.webkitPath?.endsWith(fileName) ||
                f.name === fileName
            )?.file;
            if (!file) { console.warn('⚠️ No encontrado localmente:', cleanPath); return null; }
            return URL.createObjectURL(file);
        }
    } catch (error) {
        console.error('❌ Error obteniendo archivo:', error);
        return null;
    }
}

// === HELPERS ===

function showError(message) {
    alert(message);
}

// ─────────────────────────────────────────────────────────────
//  Formato nombre archivo: 04_1P_11m02s_abp_corner.mp4
//  partes[0] = número orden  → "04"
//  partes[1] = período        → "1P" | "2P"
//  partes[2] = tiempo         → "11m02s"
//  partes[3..] = tipo jugada  → "abp_corner"
// ─────────────────────────────────────────────────────────────

function getCortesPorCarpeta(folderName) {
    const cortes = [];

    const processFileMatch = (fileName, path, extraProps = {}) => {
        const key   = fileName.replace(/\.[^.]+$/, '');   // sin extensión
        const partes = key.split('_');

        // Período: partes[1] si coincide con patrón \dP, si no "—"
        const periodoRaw = partes[1] || '';
        const periodo    = /^\d+P$/i.test(periodoRaw) ? periodoRaw.toUpperCase() : '—';

        // Tiempo: partes[2] → "11m02s"
        const tiempoRaw = partes[2] || '';
        let min = '0', seg = '00';
        if (tiempoRaw.includes('m')) {
            const temp = tiempoRaw.split('m');
            min = temp[0];
            seg = temp[1]?.replace('s', '') || '00';
        }

        // Tipo: desde partes[3] en adelante
        const tipoDesdeNombre = partes.length > 3 ? partes.slice(3).join('_') : 'otros';

        // Buscar en JSON de cortes
        const corteData = Object.entries(appState.datosCortes || {}).find(([id, c]) =>
            c.nombre_archivo?.includes(fileName) || id.includes(key)
        );

        return {
            id: key,
            nombre_archivo: fileName,
            periodo,                                             // ← NUEVO
            tipo_jugada: (corteData && corteData[1].tipo_jugada) || tipoDesdeNombre,
            minuto: min,
            segundo: seg,
            ruta_relativa: path,
            ...extraProps,
            ...(corteData ? corteData[1] : {})
        };
    };

    if (appState.sourceType === 'zip') {
        Object.keys(appState.zipContent.files).forEach(zipPath => {
            if (zipPath.includes(folderName) && (zipPath.endsWith('.mp4') || zipPath.endsWith('.webm'))) {
                const fileName = zipPath.split('/').pop();
                cortes.push(processFileMatch(fileName, `./${folderName}/${fileName}`, { ruta_zip: zipPath }));
            }
        });
    } else {
        appState.allFilesFlat.forEach(item => {
            if (item.webkitPath?.includes(folderName) && (item.webkitPath.endsWith('.mp4') || item.webkitPath.endsWith('.webm'))) {
                cortes.push(processFileMatch(item.name, item.webkitPath));
            }
        });
    }

    return cortes;
}

// === PARSEAR VALORACIONES ===
// Convierte el JSON { cortes: { hacer_cortes: [...], analizar_corte: [...] } }
// en un mapa plano indexado por nombre_archivo para búsqueda rápida
function parseValoraciones(raw) {
    const mapa = {};
    const secciones = raw?.cortes || {};
    Object.values(secciones).forEach(lista => {
        if (!Array.isArray(lista)) return;
        lista.forEach(item => {
            if (item.nombre_archivo) {
                mapa[item.nombre_archivo] = item;
            }
        });
    });
    console.log('✅ Valoraciones indexadas:', Object.keys(mapa).length, 'entradas');
    return mapa;
}

function enriquecerCortes(cortes) {
    return cortes.map(corte => {
        // Buscar por nombre_archivo exacto, luego por nombre sin extensión
        const val = appState.valoracionCortes?.[corte.nombre_archivo]
                 || appState.valoracionCortes?.[corte.nombre_archivo?.replace(/\.[^.]+$/, '') + '.mp4']
                 || null;

        return {
            ...corte,
            prioridad:   val?.prioridad   || 'baja',
            etiquetas:   val?.etiquetas   || [],
            notas:       val?.notas       || ''
        };
    });
}

function obtenerDatosApp() {
    return {
        hacer_cortes:  enriquecerCortes(getCortesPorCarpeta('hacer_cortes')),
        analizar_corte: enriquecerCortes(getCortesPorCarpeta('analizar_corte'))
    };
}

console.log('%c✅ app.js cargado correctamente', 'color: green; font-weight: bold');