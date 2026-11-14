# Despliegue Vercel y verificación pública

**Estado:** preparado para despliegue estático; **NO DESPLEGADO NI VERIFICADO en URL pública**. No se cambiaron ramas ni se realizaron commits, pushes o deploys automáticos.

1. Comprobar `npm ci`, `npm run test`, `npm run typecheck`, `npm run build`. La carpeta `dist/` es el artefacto. `vercel.json` usa preset Vite, build `npm run build`, salida `dist`; no hay backend, secretos ni rewrite necesario (solo `/`).
2. En la cuenta Vercel del equipo, importar el repositorio y seleccionar la rama prevista. Confirmar framework Vite, directorio raíz del proyecto y Node.js compatible; no cargar claves NASA: los WMTS son públicos. No subir `.env` ni credenciales.
3. Una vez publicada una **URL real** (aún no disponible), abrirla en ventana privada y en móvil; registrar URL, fecha, rama y versión desplegada en `docs/VALIDATION.md`. **No escribir una URL ficticia**.
4. En DevTools/Network de esa URL: confirmar `GET /` y assets `200`, GetCapabilities y teselas `200`/CORS en CTX, MOLA y THEMIS, y estado `visible` para cada capa. Comparar con [evidencia de alineación local](ALIGNMENT.md). Si hay fallo de red, comprobar el respaldo CTX y el mensaje de error sin pantalla en blanco.
5. Marcar A→P→B, mover P, alternar capas y restablecer; verificar que la ruta no se pierde ni cambian coordenadas. Comprobar créditos y advertencia; repetir con caché deshabilitada. Registrar capturas de la **URL pública**, errores y fecha; no equiparar build local con validación del deploy.

Si los servicios de terceros no responden en el navegador de producción, mostrar «Sin datos» o respaldo local acotado; no usar un proxy abierto no documentado ni afirmar cobertura.
