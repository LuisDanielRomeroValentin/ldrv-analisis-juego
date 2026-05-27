const stats = {
    modulos: {},

    registrar: function(nombre, modulo) {
        this.modulos[nombre] = modulo;
    },

    // Aceptamos 'boton' como parámetro opcional
    renderizar: function(tipo, boton) {
        // 1. Actualizar UI de pestañas
        const tabs = document.querySelectorAll('#stats-tabs button');
        tabs.forEach(btn => btn.classList.remove('active'));
        
        // Si pasamos el botón, lo marcamos. Si no, intentamos encontrarlo por ID
        if (boton) {
            boton.classList.add('active');
        } else {
            // Fallback: buscar botón por el tipo si no se pasa el elemento
            const fallbackBtn = document.querySelector(`[onclick*="'${tipo}'"]`);
            if (fallbackBtn) fallbackBtn.classList.add('active');
        }

        // 2. Renderizar módulo
        const container = document.getElementById('stats-content');
        if (this.modulos[tipo]) {
            this.modulos[tipo].render(container);
        } else {
            container.innerHTML = `<p>Módulo '${tipo}' no implementado aún.</p>`;
        }
    },

    // Helper compartido para recursión
    renderDetalle: function(detalle) {
        let html = '<ul class="list-unstyled ps-3 mb-1">';
        for (const [key, value] of Object.entries(detalle)) {
            const count = value._count || 0;
            const hasSub = Object.keys(value._sub).length > 0;
            html += `
                <li class="mb-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="${hasSub ? 'text-white fw-bold' : 'text-dim'} small">${key}</span>
                        <b class="text-success">${count}</b>
                    </div>
                    ${hasSub ? stats.renderDetalle(value._sub) : ''}
                </li>`;
        }
        html += '</ul>';
        return html;
    }
};