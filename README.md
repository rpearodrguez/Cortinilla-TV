# Cortinilla TV 📺

**Español** · [English](#english)

Una cortinilla ("lower third") de televisión al estilo 2004 para tus maratones de series por pantalla compartida: barra azul brillante, logo redondo y frases como *"A continuación"* o *"Seguimos con"* seguidas del nombre de la serie.

Es una app de escritorio (Electron) con dos ventanas:

- **Overlay:** ventana transparente, sin bordes y siempre encima, que ocupa la pantalla que elijas. No bloquea el ratón.
- **Panel de control:** vista previa y botones siempre a la izquierda; a la derecha, pestañas (Títulos, Cintillo, Colores y logo, Animación, Ajustes).

## Características

- **Cuatro estilos** de gráfico: *Cortinilla de series*, *Noticiero*, *Matutino* y *Auspicio* (con frases como "Este programa es auspiciado por…" o "[Serie] es auspiciado por…").
- **Posición a elegir**: esquinas o barra de ancho completo, arriba o abajo.
- **Generador de caracteres**: etiqueta, título y subtítulo (por ejemplo nombre y cargo), con frases predefinidas o texto propio.
- **Cintillo desplazable** tipo noticiero, con etiqueta propia ("ÚLTIMA HORA"), arriba o abajo; se apila con la cortinilla sin taparla.
- **Barrido de entrada y salida configurable**: desde un lado, sube/baja, desvanecer, zoom, rebote o revelado, con velocidad ajustable.
- Frases predefinidas en **español e inglés**: cambia de idioma con los botones **ES / EN** (el panel también cambia).
- **Vista previa** en el propio panel (no aparece en la pantalla compartida) para elegir colores y probar la entrada y salida con un clic.
- Elección de la **pantalla** donde aparece (por defecto, la segunda si existe).
- **Logo personalizado**: imagen propia (PNG, JPG, GIF, WebP o SVG) o texto corto.
- **Colores** configurables para la barra, la frase, el título y el logo.
- Duración automática o manual.
- Recuerda tus preferencias entre sesiones.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior.
- Windows (probado), macOS o Linux (sin probar).

## Uso

```bash
npm install
npm start
```

En Windows también puedes hacer doble clic en `iniciar.bat`.

1. Comparte **la pantalla completa** donde aparece la cortinilla (no una ventana suelta).
2. Escribe el nombre de la serie en el panel y pulsa **Enter** para mostrarla; **Esc** la oculta.
3. Deja el panel en otra pantalla o minimízalo, para que no salga en lo que compartes.

### Atajos

| Tecla | Acción |
| ----- | ------ |
| Enter | Mostrar la cortinilla (en la pestaña Cintillo, mostrar el cintillo) |
| Esc   | Ocultar la cortinilla |

### Limitaciones

- Si compartes una ventana en vez de la pantalla, la cortinilla no se verá.
- Algunos reproductores en pantalla completa exclusiva pueden taparla.
- Solo cubre una pantalla a la vez.

## Versión para OBS

[`index.html`](index.html) es una versión de una sola página (con fondo transparente) para usarla como *Fuente de navegador* en OBS, sin necesidad de Electron.

## Estructura

| Archivo | Descripción |
| ------- | ----------- |
| `main.js` | Proceso principal de Electron: crea las ventanas y gestiona pantallas y logo. |
| `preload.js` | Puente seguro entre el panel/overlay y el proceso principal. |
| `panel.html` | Panel de control con pestañas, idiomas ES/EN y vista previa. |
| `overlay.html` | La cortinilla que se dibuja sobre la pantalla. |
| `lower.css`, `lower.js` | Estilos, animaciones y lógica de los gráficos y el cintillo, compartidos por el overlay y la vista previa. |
| `index.html` | Versión independiente para OBS. |

## Privacidad

La app no usa red ni envía datos. Tus preferencias y el logo elegido se guardan solo en el almacenamiento local de la app en tu equipo, no en este repositorio.

## Licencia

[MIT](LICENSE) © 2026 Richard Peña. Los logos y marcas que cargues en la app pertenecen a sus respectivos dueños.

---

## English

A 2004-style TV lower-third for your screen-sharing series nights: glossy blue bar, round logo, and phrases like *"Up next"* or *"Coming up"* followed by the show's name.

It's a desktop app (Electron) with two windows:

- **Overlay:** a transparent, frameless, always-on-top window covering the screen you choose. It never blocks the mouse.
- **Control panel:** preview and buttons always on the left; tabs on the right (Titles, Ticker, Colors & logo, Animation, Settings).

### Features

- **Four graphic styles**: *Series bumper*, *News*, *Morning show* and *Sponsor* (phrases like "This program is sponsored by…" or "[Show] is sponsored by…").
- **Choose the position**: corners or full-width bar, top or bottom.
- **Character generator**: tag, title and subtitle (e.g. name and role), with preset phrases or your own text.
- **Scrolling news ticker** with its own label ("BREAKING"), top or bottom; it stacks with the bumper without covering it.
- **Customizable enter/exit animation**: from a side, rise/drop, fade, zoom, bounce or wipe, with adjustable speed.
- Preset phrases in **Spanish and English**: switch with the **ES / EN** buttons (the panel UI changes too).
- Built-in **preview** in the panel (never shown on the shared screen) to fine-tune colors and test the enter/exit with one click.
- Choose which **screen** it appears on (defaults to the second one if present).
- **Custom logo**: your own image (PNG, JPG, GIF, WebP or SVG) or short text.
- Customizable **colors** for the bar, phrase, title and logo.
- Automatic or manual duration.
- Remembers your settings between sessions.

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer.
- Windows (tested), macOS or Linux (untested).

### Usage

```bash
npm install
npm start
```

1. Share your **entire screen** (the one showing the overlay), not a single window.
2. Type the show name in the panel and press **Enter** to display it; **Esc** hides it.
3. Keep the panel on another screen or minimized so it doesn't appear in the shared view.

### Limitations

- Sharing a single window won't capture the overlay.
- Some players in exclusive fullscreen may cover it.
- Covers one screen at a time.

### OBS version

[`index.html`](index.html) is a standalone single-page version (transparent background) you can use as a *Browser Source* in OBS, no Electron needed.

### Privacy

The app makes no network requests and sends no data. Your settings and chosen logo are stored only in the app's local storage on your machine, never in this repository.

### License

[MIT](LICENSE) © 2026 Richard Peña. Logos and trademarks you load into the app belong to their respective owners.
