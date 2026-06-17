const translator = {
    dictionary: {},
    currentLang: localStorage.getItem('userLang') || 'es',

    // Cargar el JSON
    init: async function() {
        try {
            const response = await fetch('data/lang.json');
            this.dictionary = await response.json();
            this.applyTranslations();
        } catch (error) {
            console.error("Error cargando el diccionario:", error);
        }
    },

    setLanguage: function(lang) {
        this.currentLang = lang;
        localStorage.setItem('userLang', lang);
        this.applyTranslations();

        if (typeof resume !== 'undefined') {
            resume.renderizar();
        }
    },

    applyTranslations: function() {
        const dict = this.dictionary[this.currentLang];
        if (!dict) return;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!dict[key]) return;

            const translation = dict[key];

            // 1. Caso especial: SELECT / OPTION
            if (el.tagName === 'OPTION') {
                el.textContent = translation;
                // A veces el select necesita refrescarse manualmente si ya estaba abierto,
                // pero esto cubre el valor visual del texto.
                return;
            }

            // 2. Caso especial: SUMMARY (para tus carpetas)
            // Como el summary tiene etiquetas <strong> dentro, buscamos el nodo de texto
            // o el primer contenedor que guarde el título.
            if (el.tagName === 'SUMMARY') {
                const strong = el.querySelector('strong');
                if (strong) {
                    // Preservamos el icono (emojis) que tienes en tu template original
                    // y solo reemplazamos el texto
                    const icon = strong.querySelector('span') ? '' : strong.innerHTML.split('</strong>')[0]; 
                    // Mejor aún:
                    strong.textContent = translation; 
                    return;
                }
            }

            // 3. Caso general (con o sin hijos)
            const hasChildren = el.children.length > 0;
            if (hasChildren) {
                let found = false;
                el.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        node.textContent = translation;
                        found = true;
                    }
                });
                if (!found && el.firstChild) el.firstChild.textContent = translation;
            } else {
                el.textContent = translation;
            }
        });
    },

    get: function(key) {
        const dict = this.dictionary[this.currentLang];
        if (dict && dict[key]) {
            return dict[key];
        }
        console.warn(`⚠️ Traducción no encontrada para: ${key}`);
        return key; // Devuelve la clave si no existe, útil para detectar errores
    },

    getMappedKey: function(key) {
        // 1. Normalizamos: 
        // - Quitamos tildes
        // - Reemplazamos cualquier grupo de espacios o guiones (uno o más) por un solo guion bajo
        const slug = key.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[\s-]+/g, '_') // Agrupa espacios y guiones en un solo '_'
                        .replace(/_+/g, '_');    // Evita guiones bajos duplicados
        
        const mappedKey = `label.${slug}`;
        const translation = this.get(mappedKey);
        
        // Si no encuentra la traducción, muestra la clave original limpia o la que llega
        return translation !== mappedKey ? translation : key;
    }
   
};

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => translator.init());