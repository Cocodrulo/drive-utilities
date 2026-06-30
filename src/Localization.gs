var TRANSLATIONS = {
    es: {
        main:{
            subtitle:"Copia carpetas sin sobreescritura",
            selected_items:"Elementos seleccionados",
            no_items:"No se han seleccionado elementos. Selecciona archivos o carpetas en Drive.",
            dest_folder:"Carpeta de destino",
            dest_folder_default:"📍 Misma carpeta del archivo (por defecto)",
            current_dest:"Destino actual",
            select_dest_folder:"📂 Seleccionar carpeta de destino",
            use_source_folder_default:"Usar carpeta de origen (por defecto)",
            copy_now:"📋  Copiar ahora",
            dest_folder_restored:"Destino restablecido a carpeta de origen.",
            copy_result:"Resultado de la copia",
            back:"← Volver",
            copied:"✅ Copiados:\n{{count}}",
            errors:"❌ Errores:\n{{count}}",
            waiting:"Selección en curso...",
            waiting_text:"Por favor, selecciona la carpeta en la ventana emergente y luego presiona el botón de abajo.",
            confirm_and_view:"✅ Confirmar y Ver Selección"
        },
        picker:{
            title:"Seleccionar carpeta de destino",
            folder_selected:"✅ Carpeta guardada de forma segura. Ya puedes cerrar esta ventana y regresar al Add-on.",
            running:"Add-on Drive Copy ejecutándose correctamente.",
            heading: "Seleccionar carpeta de destino",
            description: "Haz clic en el botón para abrir el selector de Google Drive y elige la carpeta donde se copiarán tus archivos.",
            btn_open: "Abrir selector de carpetas",
            auth_progress: "Autenticando...",
            auth_error: "Error al autenticar: ",
            not_ready: "El selector no está listo. Inténtalo de nuevo.",
            saving: "Guardando selección...",
            folder_saved: "✅ Carpeta \"{{name}}\" seleccionada. Cierra esta ventana.",
            save_error: "Error al guardar: "
        },
        options: {
            title: "Opciones avanzadas",
            prefix: "Prefijo para el nombre",
            suffix: "Sufijo para el nombre",
            search: "Buscar texto",
            replace: "Reemplazar por",
            preserve_perms: "Preservar permisos de uso compartido",
            conflict: "Resolución de conflictos",
            conflict_rename: "Renombrar (mantener ambos)",
            conflict_overwrite: "Sobrescribir",
            conflict_skip: "Omitir",
            filter: "Filtrar elementos",
            filter_all: "Copiar todo",
            filter_files: "Solo archivos (omitir carpetas)",
            filter_folders: "Solo carpetas (omitir archivos)",
            filter_gdocs: "Solo Documentos/Hojas/Presentaciones Google",
            dry_run: "Simulación (no realizar cambios reales)"
        },
        history: {
            title: "Historial y Favoritos",
            recent: "Destinos recientes",
            favorites: "Favoritos",
            pin: "📌 Pin",
            unpin: "❌ Desanclar",
            set_dest: "🎯 Seleccionar",
            no_history: "No hay historial de copias reciente.",
            history_title: "Historial de copias",
            clear_history: "Limpiar historial",
            add_fav: "⭐ Guardar actual como favorito"
        },
        simulation: {
            report_title: "Reporte de Simulación (Dry Run)",
            msg: "Esto es una simulación. Ningún archivo fue copiado o modificado en Google Drive.",
            would_copy_file: "📄 Copiaría: {{name}}",
            would_copy_folder: "📁 Copiaría carpeta: {{name}}",
            would_overwrite: "🔄 Sobrescribiría: {{name}}",
            would_skip: "⏭️ Omitiría: {{name}}",
            would_rename: "📝 Renombraría a: {{name}}"
        }
    },
    en:{
        main:{
            subtitle:"Folders Copy without Overwrite",
            selected_items:"Selected items",
            no_items:"No items selected. Select files or folders in Drive.",
            dest_folder:"Destination folder",
            dest_folder_default:"📍 Same folder as the file (by default)",
            current_dest:"Current destination",
            select_dest_folder:"📂 Select destination folder",
            use_source_folder_default:"Use source folder (by default)",
            copy_now:"📋  Copy now",
            dest_folder_restored:"Destination restored to source folder.",
            copy_result:"Copy result",
            back:"← Back",
            copied:"✅ Copied:\n{{count}}",
            errors:"❌ Errors:\n{{count}}",
            waiting:"Selection in progress...",
            waiting_text:"Please select the folder in the pop-up window and then press the button below.",
            confirm_and_view:"✅ Confirm and View Selection"
        },
        picker:{
            title:"Select destination folder",
            folder_selected:"✅ Folder saved securely. You can now close this window and return to the Add-on.",
            running:"Drive Copy Add-on running correctly.",
            heading: "Select destination folder",
            description: "Click the button to open the Google Drive picker and choose the folder where your files will be copied.",
            btn_open: "Open folder picker",
            auth_progress: "Authenticating...",
            auth_error: "Error authenticating: ",
            not_ready: "The picker is not ready. Please try again.",
            saving: "Saving selection...",
            folder_saved: "✅ Folder \"{{name}}\" selected. You can close this window.",
            save_error: "Error saving: "
        },
        options: {
            title: "Advanced options",
            prefix: "Name prefix",
            suffix: "Name suffix",
            search: "Search text",
            replace: "Replace with",
            preserve_perms: "Preserve sharing permissions",
            conflict: "Conflict resolution",
            conflict_rename: "Rename (keep both)",
            conflict_overwrite: "Overwrite",
            conflict_skip: "Skip",
            filter: "Filter items",
            filter_all: "Copy all",
            filter_files: "Files only (skip folders)",
            filter_folders: "Folders only (skip files)",
            filter_gdocs: "Google Docs/Sheets/Slides only",
            dry_run: "Simulation (do not make real changes)"
        },
        history: {
            title: "History & Favorites",
            recent: "Recent destinations",
            favorites: "Favorites",
            pin: "📌 Pin",
            unpin: "❌ Unpin",
            set_dest: "🎯 Select",
            no_history: "No recent copy history.",
            history_title: "Copy history",
            clear_history: "Clear history",
            add_fav: "⭐ Save current as favorite"
        },
        simulation: {
            report_title: "Simulation Report (Dry Run)",
            msg: "This is a simulation. No files were copied or modified in Google Drive.",
            would_copy_file: "📄 Would copy: {{name}}",
            would_copy_folder: "📁 Would copy folder: {{name}}",
            would_overwrite: "🔄 Would overwrite: {{name}}",
            would_skip: "⏭️ Would skip: {{name}}",
            would_rename: "📝 Would rename to: {{name}}"
        }
    }
};

function t(path, args = {}) {
    var locale = Session.getActiveUserLocale(); 
    var langMap = TRANSLATIONS[locale] || TRANSLATIONS['en'];

    const keys = path.split('.');
    let translation = keys.reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : null;
    }, langMap);

    if (!translation) return path;

    Object.keys(args).forEach((key) => {
      translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), args[key]);
    });

    return translation;
}
