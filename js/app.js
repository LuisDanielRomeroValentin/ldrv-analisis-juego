// js/app.js

const appState = {
    sourceType: null,
    zipContent: null,
    localFiles: [],
    allFilesFlat: [],
    partidoData: null,
    datosCortes: null,
    valoracionCortes: null,
    tomaDatos: null,
    jugadasData: [],
    impactosPorteriaData: [], // 🥅 Almacén oficial para los impactos de portería planos
    resumenInformeData: null   // 📋 NUEVO: Almacén oficial para el JSON del informe dinámico
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

        // BUSQUEDA FLEXIBLE DE CONFIGURACIONES PRINCIPALES:
        const pFileName = Object.keys(zip.files).find(f => f.split('/').pop().toLowerCase() === "datos_partido.json");
        const cFileName = Object.keys(zip.files).find(f => f.split('/').pop().toLowerCase() === "datos_cortes.json");
        const vFileName = Object.keys(zip.files).find(f => {
            const name = f.split('/').pop().toLowerCase();
            return name.includes("valoracion") && name.endsWith(".json");
        });
        
        // NUEVO: Búsqueda elástica de resumen_informe.json
        const rFileName = Object.keys(zip.files).find(f => f.split('/').pop().toLowerCase() === "resumen_informe.json");

        if (!pFileName) throw new Error('No se encontró datos_partido.json en el ZIP');
        if (!cFileName) throw new Error('No se encontró datos_cortes.json en el ZIP');
        if (!vFileName) throw new Error('No se encontró valoraciones_cortes.json en el ZIP');

        // Extraemos el contenido principal
        appState.partidoData      = JSON.parse(await zip.file(pFileName).async("string"));
        appState.datosCortes      = JSON.parse(await zip.file(cFileName).async("string"));
        appState.valoracionCortes = parseValoraciones(JSON.parse(await zip.file(vFileName).async("string")));

        // NUEVO: Procesar opcionalmente el resumen si viene en el ZIP
        if (rFileName) {
            try {
                appState.resumenInformeData = JSON.parse(await zip.file(rFileName).async("string"));
                console.log("📋 Resumen de informe cargado desde ZIP con éxito.");
                // Mostrar botones de la interfaz
                const btnNav = document.getElementById('btn-nav-resumen');
                const btnNavMob = document.getElementById('btn-nav-resumen-mobile');
                if (btnNav) btnNav.style.setProperty('display', 'inline-block', 'important');
                if (btnNavMob) btnNavMob.style.setProperty('display', 'block', 'important');
            } catch (e) {
                console.error("❌ Error parseando resumen_informe.json en ZIP:", e);
            }
        }

        // Mapeo plano de todos los archivos del ZIP
        appState.allFilesFlat = Object.keys(zip.files).map(path => ({
            path,
            name: path.split('/').pop(),
            folder: path.split('/').slice(0, -1).join('/'),
            isFile: !zip.files[path].dir
        }));

        // 📋 CARGA DE JUGADAS TÁCTICAS DESDE ZIP
        appState.jugadasData = [];
        const jugadasZipPaths = Object.keys(zip.files).filter(path => {
            const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
            return normalizedPath.includes('dibujar_jugadas/') && normalizedPath.endsWith('.json');
        });

        for (const path of jugadasZipPaths) {
            try {
                const contentStr = await zip.file(path).async("string");
                appState.jugadasData.push(JSON.parse(contentStr));
            } catch (e) {
                console.error("❌ Error parseando jugada en ZIP:", path, e);
            }
        }
        console.log(`📋 Jugadas tácticas cargadas desde ZIP: ${appState.jugadasData.length}`);

        // 🥅 CARGA DE IMPACTOS PORTERÍA DESDE ZIP
        appState.impactosPorteriaData = [];
        const impactosZipPaths = Object.keys(zip.files).filter(path => {
            const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
            return normalizedPath.includes('impacto_porteria/') && normalizedPath.endsWith('.json');
        });

        for (const path of impactosZipPaths) {
            try {
                const contentStr = await zip.file(path).async("string");
                appState.impactosPorteriaData.push(JSON.parse(contentStr));
            } catch (e) {
                console.error("❌ Error parseando impacto en ZIP:", path, e);
            }
        }
        console.log(`🥅 Archivos de impacto cargados desde ZIP: ${appState.impactosPorteriaData.length}`);

        // ── INSERCIÓN: RELLENAR SELECTOR DE TIPOS DE IMPACTOS TRAS LA CARGA ZIP ──
        poblarFiltroTiposImpactos(appState.impactosPorteriaData);

        ui.initApp();
    } catch (error) {
        console.error('❌ Error en ZIP:', error);
        showError(`Error: ${error.message}`);
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
        
        // NUEVO: Búsqueda flexible de resumen_informe.json local
        const rFile = files.find(f => f.name === "resumen_informe.json");

        if (!pFile) throw new Error('No se encontró datos_partido.json');
        if (!cFile) throw new Error('No se encontró datos_cortes.json');
        if (!vFile) throw new Error('No se encontró valoraciones_cortes.json');

        appState.partidoData  = JSON.parse(await pFile.text());
        appState.datosCortes  = JSON.parse(await cFile.text());
        appState.valoracionCortes = parseValoraciones(JSON.parse(await vFile.text()));

        // NUEVO: Procesar opcionalmente el resumen en carga local
        if (rFile) {
            try {
                appState.resumenInformeData = JSON.parse(await rFile.text());
                console.log("📋 Resumen de informe cargado desde carpeta local con éxito.");
                // Mostrar botones de la interfaz
                const btnNav = document.getElementById('btn-nav-resumen');
                const btnNavMob = document.getElementById('btn-nav-resumen-mobile');
                if (btnNav) btnNav.style.setProperty('display', 'inline-block', 'important');
                if (btnNavMob) btnNavMob.style.setProperty('display', 'block', 'important');
            } catch (e) {
                console.error("❌ Error parseando resumen_informe.json local:", e);
            }
        }

        appState.allFilesFlat = files.map(f => ({
            file: f,
            name: f.name,
            webkitPath: f.webkitRelativePath,
            folder: f.webkitRelativePath ? f.webkitRelativePath.split('/')[0] : ''
        }));

        // 📋 CARGA DE JUGADAS TÁCTICAS DESDE CARPETA LOCAL
        appState.jugadasData = [];
        const jugadasFiles = files.filter(f => {
            const normalizedPath = f.webkitRelativePath.replace(/\\/g, '/').toLowerCase();
            return normalizedPath.includes('dibujar_jugadas/') && f.name.endsWith('.json');
        });

        for (const file of jugadasFiles) {
            try {
                const jsonContent = JSON.parse(await file.text());
                appState.jugadasData.push(jsonContent);
            } catch (e) {
                console.error("❌ Error parseando jugada local:", file.name, e);
            }
        }
        console.log(`📋 Jugadas tácticas cargadas desde carpeta: ${appState.jugadasData.length}`);
        
        // 🥅 CARGA DE IMPACTOS PORTERÍA DESDE CARPETA LOCAL
        appState.impactosPorteriaData = [];
        const impactosFiles = files.filter(f => {
            const normalizedPath = f.webkitRelativePath.replace(/\\/g, '/').toLowerCase();
            return normalizedPath.includes('impacto_porteria/') && f.name.endsWith('.json');
        });

        for (const file of impactosFiles) {
            try {
                const jsonContent = JSON.parse(await file.text());
                appState.impactosPorteriaData.push(jsonContent);
            } catch (e) {
                console.error("❌ Error parseando impacto local:", file.name, e);
            }
        }
        console.log(`🥅 Archivos de impacto cargados desde carpeta: ${appState.impactosPorteriaData.length}`);

        // 🔴 TUS LOGS DE INSPECCIÓN ORIGINALES:
        console.log("--- INSPECCIÓN DE JUGADAS TÁCTICAS CARGADAS ---");
        console.log("Contenido completo de appState.jugadasData:", appState.jugadasData);
        if (appState.jugadasData.length > 0) {
            console.log("Estructura de la primera jugada detectada:", appState.jugadasData[0]);
        }

        // ── INSERCIÓN: RELLENAR SELECTOR DE TIPOS DE IMPACTOS TRAS LA CARGA LOCAL ──
        poblarFiltroTiposImpactos(appState.impactosPorteriaData);

        ui.initApp();
    } catch (error) {
        console.error('❌ Error en carpeta:', error);
        showError(`Error procesando carpeta: ${error.message}`);
    }
}

// === OBTENER ARCHIVO COMO BLOB ===

async function getFileAsset(rutaRelativa) {
    const nombreArchivoBuscado = rutaRelativa.split('/').pop().trim();
    console.log("🔍 Intentando cargar archivo:", nombreArchivoBuscado);

    if (appState.sourceType === 'zip') {
        let file = appState.zipContent.file(rutaRelativa);
        
        if (!file) {
            const realPath = Object.keys(appState.zipContent.files).find(path => 
                path.replace(/\\/g, '/').endsWith(nombreArchivoBuscado)
            );
            if (realPath) file = appState.zipContent.file(realPath);
        }

        if (file) {
            const blob = await file.async('blob');
            return URL.createObjectURL(blob);
        }
    } else {
        const fileObj = appState.allFilesFlat.find(f => {
            if (!f) return false;
            return f.name === nombreArchivoBuscado;
        });

        if (fileObj) {
            console.log("✅ Archivo encontrado físicamente:", fileObj.name);
            
            const blobToUse = (fileObj instanceof Blob || fileObj instanceof File) 
                              ? fileObj 
                              : (fileObj.file && fileObj.file instanceof Blob ? fileObj.file : null);

            if (blobToUse) {
                return URL.createObjectURL(blobToUse);
            }
        }
    }

    console.error("❌ ERROR FINAL: No existe el archivo:", nombreArchivoBuscado);
    return null;
}

// === HELPERS ===

function showError(message) {
    alert(message);
}

// ─────────────────────────────────────────────────────────────
//  Formato nombre archivo: 04_1P_11m02s_abp_corner.mp4
// ─────────────────────────────────────────────────────────────

function getCortesPorCarpeta(folderName) {
    const cortes = [];
    const buscarAnalizados = folderName.toLowerCase().includes('analizar');

    console.log(`--- MODO REPARACIÓN: Buscando ${buscarAnalizados ? 'ANALIZADOS' : 'BRUTOS'} ---`);

    appState.allFilesFlat.forEach((item) => {
        const fileName = item.name;
        
        if (fileName.endsWith('.mp4') || fileName.endsWith('.webm')) {
            const esAnalizado = fileName.includes('_analizado');

            if ((buscarAnalizados && esAnalizado) || (!buscarAnalizados && !esAnalizado)) {
                
                let key = fileName.replace(/\.[^.]+$/, '').replace('_analizado', '');
                const partes = key.split('_');
                
                const periodo = partes.find(p => p.includes('P')) || '—';
                const tiempo = partes.find(p => p.includes('m')) || '00:00';

                 cortes.push({
                    id: key,
                    nombre_archivo: fileName,
                    periodo: periodo,
                    minuto: tiempo.split('m')[0] || '0',
                    segundo: tiempo.split('m')[1]?.replace('s', '') || '00',
                    tipo_jugada: partes.slice(3).join(' ') || 'Acción',
                    ruta_relativa: fileName
                });
            }
        }
    });

    console.log(`✅ ¡Éxito! Encontrados ${cortes.length} clips.`);
    return cortes;
}

const processFileMatch = (fileName, path) => {
    let key = fileName.replace(/\.[^.]+$/, '').replace('_analizado', '');
    return {
        id: key,
        nombre_archivo: fileName,
        ruta_relativa: path,
    };
};

function enriquecerCortes(cortes) {
    return cortes.map(corte => {
        const val = appState.valoracionCortes?.[corte.nombre_archivo]
                 || appState.valoracionCortes?.[corte.nombre_archivo?.replace(/\.[^.]+$/, '') + '.mp4']
                 || null;

        return {
            ...corte,
            prioridad:   val?.prioridad   || 'baja',
            etiquetas:   val?.etiquetas   || [],
            notes:       val?.notas       || ''
        };
    });
}

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

function obtenerDatosApp() {
    return {
        hacer_cortes:  enriquecerCortes(getCortesPorCarpeta('hacer_cortes')),
        analizar_corte: enriquecerCortes(getCortesPorCarpeta('analizar_corte'))
    };
}

// ── INSERCIÓN: FUNCIÓN INYECTORA DE OPCIONES ÚNICAS DE TIPO EN EL DOM ──
function poblarFiltroTiposImpactos(datosImpactos) {
    const selectTipo = document.getElementById('impactos-tipo-filter');
    if (!selectTipo) return;

    const tiposUnicos = new Set();
    datosImpactos.forEach(item => {
        const tipo = item.tipo_jugada || item.tipo;
        if (tipo) tiposUnicos.add(tipo.trim());
    });

    selectTipo.innerHTML = '<option value="TODOS">Todos los tipos</option>';

    tiposUnicos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        selectTipo.appendChild(option);
    });
    console.log(`🎯 Selector '#impactos-tipo-filter' cargado con ${tiposUnicos.size} tipos únicos.`);
}

console.log('%c✅ app.js cargado correctamente', 'color: green; font-weight: bold');