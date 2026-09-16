# Cambios aplicados (auditoría de bugs) — Changan CEDIS

Este archivo resume exactamente qué se modificó en el código y por qué.
No se tocó ningún otro archivo ni funcionalidad fuera de lo descrito aquí.

## 0. [URGENTE] Pedidos borrados que "resucitaban" (src/App.tsx, src/utils/firestoreSync.ts)

**Síntoma reportado:** se borraron ~1100 pedidos duplicados (de 2000 a 900), y
durante el día siguiente fueron reapareciendo hasta llegar a 1434.

**Causa real, confirmada en el código:** el botón "Sincronizar Todo" /
"Consolidación Nacional" (`handleSyncAll`) leía los pedidos desde el
servidor Express (`/api/orders`), cuyo endpoint de sincronización
(`/api/sync-bootstrap` en `server.ts`) **solo une/agrega registros y nunca
borra nada**. Si CUALQUIER computadora (la tuya u otra sucursal) todavía
tenía en su `localStorage` los duplicados de antes de la limpieza, al
presionar "Sincronizar" esos duplicados se reinyectaban y sobrescribían
directamente lo que se mostraba en pantalla — sin pasar por Firestore, que
sí tenía los datos ya limpios.

**Cambio aplicado:**
- Se agregaron `fetchOrdersOnceFromFirestore`,
  `fetchContainersOnceFromFirestore` y `fetchCatalogOnceFromFirestore` en
  `src/utils/firestoreSync.ts` (lectura directa y única desde Firestore).
- `handleSyncAll` en `src/App.tsx` ahora usa estas tres funciones en vez de
  `fetchOrdersFromServer` / `fetchContainersFromServer` /
  `fetchCatalogFromServer` (que seguían pegándole al servidor Express).
- Las funciones viejas siguen existiendo en `src/utils/apiSync.ts` por si
  las necesitas después, pero ya no se llaman desde ningún botón de la app.

**Importante:** este bug ya causó que existan zombis en Firestore también
(porque aunque "Sincronizar" no escribía en Firestore directamente, si
alguien luego creaba/editaba algo con esos duplicados visibles en pantalla,
sí podían terminar guardándose ahí). **Recomendación:** una vez despliegues
este fix, vuelve a limpiar los duplicados una sola vez más — después de este
cambio no deberían regresar.

## 1. Firestore como única fuente de verdad (src/App.tsx)

**Problema:** al arrancar, la app leía los datos guardados en `localStorage`
del navegador (distintos en cada computadora/sucursal) y los usaba para
"sembrar" Firestore si estaba vacío, además de empujarlos también al
servidor Express. Si dos sucursales abrían la app por primera vez con datos
locales diferentes, ambas podían sembrar la nube con su propia versión,
generando pedidos duplicados o inconsistentes.

**Cambio:** se eliminó esa siembra automática y el bootstrap al servidor en
el `useEffect` inicial. Ahora la app solo escucha Firestore en tiempo real
(`onSnapshot`). `localStorage` se sigue usando, pero únicamente como caché
local (para pintar algo mientras llega la primera respuesta de Firestore, o
para modo sin conexión) — nunca se vuelve a subir a la nube automáticamente.

**Lo que debes decidir tú:** si tu proyecto de Firestore está actualmente
vacío y necesitas cargarlo con datos iniciales, hazlo una sola vez de forma
manual (por ejemplo desde el modal de "Restaurar Base de Datos" que ya
existe en la app, importando un `.json` de respaldo), no automáticamente.

## 2. PIN de administrador ya no está en el código del cliente

**Problema:** en `src/App.tsx` existía esta línea, visible para cualquiera
que abriera las herramientas de desarrollador del navegador:
```
const validPins = ['1234', 'CHANGAN2026', 'ADMIN', 'GERENCIA'];
```

**Cambio:**
- Se agregó el endpoint `POST /api/admin/verify-pin` en `server.ts`, que
  valida el PIN contra la variable de entorno `ADMIN_PINS` (nunca se envía
  la lista de PINs válidos al navegador) y limita a 8 intentos cada 5
  minutos por IP.
- `src/App.tsx` (`handleUnlockAdmin`) ahora llama a ese endpoint en vez de
  comparar contra una lista local. La función pasó de ser síncrona a async.
- `src/components/MasterAdminSecurityModal.tsx` se actualizó para esperar
  (`await`) esa verificación y mostrar "Verificando..." mientras tanto.
- `.env.example` documenta la nueva variable `ADMIN_PINS`.

**Acción requerida de tu parte (importante):**
En el panel de Vercel de tu proyecto, ve a **Settings → Environment
Variables** y agrega:
```
ADMIN_PINS=TU-PIN-SECRETO-1,TU-PIN-SECRETO-2
```
Si no configuras esta variable, el sistema usará `CHANGAN2026` como PIN por
defecto (igual que antes), así que no perderás acceso — pero debes
cambiarlo por uno nuevo que nadie haya visto en el código viejo.

## 3. Lo que NO se tocó (pendiente, fuera de este cambio)

- **Persistencia local del servidor en Vercel:** `server.ts` todavía guarda
  copias en archivos JSON locales (`data/*.json`) como respaldo/caché del
  servidor. En Vercel (serverless) ese disco es efímero y no debe
  considerarse confiable — Firestore sigue siendo tu base de datos real, así
  que esto no debería causarte pérdida de datos, pero si ves en los logs de
  Vercel errores de escritura en disco, es esperado y no es un bug nuevo.
- **Lógica de "merge" en `src/utils/apiSync.ts`** (`fetchOrdersFromServer`,
  `bootstrapClientStateToServer`, etc.): sigue existiendo en el archivo,
  pero ya NO se llama desde ningún botón de la app (ver punto 0). Se dejó
  el código ahí por si en el futuro quieres reutilizar el servidor Express
  para otra cosa; si no lo vas a usar, se puede eliminar por completo en
  otra sesión para simplificar el proyecto.
