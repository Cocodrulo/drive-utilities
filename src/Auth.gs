/**
 * Devuelve el token OAuth del usuario actual.
 * Llamado desde Picker.html via google.script.run
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}
