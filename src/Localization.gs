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
        }
    }
}

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
