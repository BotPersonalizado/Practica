import { DOMImplementation, XMLSerializer } from 'xmldom';
import JsBarcode from 'jsbarcode';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Rutas de archivos
const src = join(__dirname, '..', 'src');
const defaultAvatar = join(src, 'avatar_contact.png');
const defaultBackground = join(src, 'Aesthetic', 'Aesthetic_000.jpeg');
const defaultBarcode = '1234567890';  // Valor de ejemplo para el código de barras

// Función para generar el código de barras en formato SVG
const generateBarcode = (data) => {
  const xmlSerializer = new XMLSerializer();
  const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  JsBarcode(svgNode, data, {
    xmlDocument: document,
  });

  return xmlSerializer.serializeToString(svgNode);
};

// Función para convertir una cadena SVG en una imagen en base64
const toImg = (svg, format = 'png') => new Promise((resolve, reject) => {
  if (!svg) return resolve(Buffer.alloc(0));
  const bufs = [];
  const im = spawn('magick', ['convert', 'svg:-', `${format}:-`]);
  im.on('error', (e) => reject(e));
  im.stdout.on('data', (chunk) => bufs.push(chunk));
  im.stdin.write(Buffer.from(svg));
  im.stdin.end();
  im.on('close', (code) => {
    if (code !== 0) reject(code);
    resolve(Buffer.concat(bufs));
  });
});

// Función para convertir un buffer a base64 con un MIME tipo
const toBase64 = (buffer, mime) => `data:${mime};base64,${buffer.toString('base64')}`;

// Setter para actualizar el atributo href de una imagen en SVG
const imageSetter = (img, value) => img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value);

// Setter para actualizar el texto de un elemento SVG
const textSetter = (el, value) => el.textContent = value;

// Función para generar el SVG con los datos proporcionados
const genSVG = async ({
  wid = defaultBarcode,
  pp = defaultAvatar,
  title = '',
  name = '',
  text = '',
  background = defaultBackground,
} = {}) => {
  const { document: svg } = new JSDOM(readFileSync(join(src, 'welcome.svg'), 'utf-8')).window;
  
  const elements = {
    code: ['#_1661899539392 > g:nth-child(6) > image', imageSetter, toBase64(await toImg(generateBarcode(wid.replace(/[^0-9]/g, '')), 'png'), 'image/png')],
    pp: ['#_1661899539392 > g:nth-child(3) > image', imageSetter, pp],
    text: ['#_1661899539392 > text.fil1.fnt0', textSetter, text],
    title: ['#_1661899539392 > text.fil2.fnt1', textSetter, title],
    name: ['#_1661899539392 > text.fil2.fnt2', textSetter, name],
    bg: ['#_1661899539392 > g:nth-child(2) > image', imageSetter, background],
  };

  // Actualizar los elementos en el SVG
  for (const [selector, set, value] of Object.values(elements)) {
    const el = svg.querySelector(selector);
    set(el, value);
  }

  return svg.body.innerHTML;
};

// Función principal para renderizar el SVG con los valores proporcionados
const render = async ({
  wid = defaultBarcode,
  pp = toBase64(readFileSync(defaultAvatar), 'image/png'),
  name = '',
  title = '',
  text = '',
  background = toBase64(readFileSync(defaultBackground), 'image/jpeg'),
} = {}, format = 'png') => {
  const svg = await genSVG({ wid, pp, name, title, text, background });
  return await toImg(svg, format);
};

// Si se ejecuta como script, genera y muestra la imagen
if (require.main === module) {
  render({
    wid: '1234567890',  // Código de barras
    name: 'John Doe',
    text: 'Lorem ipsum\ndot sit color',
    title: 'grup testing',
  }, 'jpg').then((result) => {
    process.stdout.write(result);  // Imprime la imagen en la salida estándar
  });
} else {
  module.exports = render;  // Exporta la función para ser utilizada en otros módulos
}
