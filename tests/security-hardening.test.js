const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mapView = fs.readFileSync(path.join(root, 'Code', 'frontend', 'map-view.js'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const headers = vercel.headers.find((entry) => entry.source === '/(.*)').headers;
const headerMap = Object.fromEntries(headers.map((header) => [header.key, header.value]));

assert.match(headerMap['Content-Security-Policy'], /default-src 'self'/);
assert.match(headerMap['Content-Security-Policy'], /script-src 'self' 'unsafe-inline' https:\/\/cdnjs\.cloudflare\.com/);
assert.match(headerMap['Content-Security-Policy'], /https:\/\/tile\.openstreetmap\.org/);
assert.match(headerMap['Content-Security-Policy'], /https:\/\/cdnjs\.cloudflare\.com/);
assert.equal(headerMap['Permissions-Policy'], 'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()');
assert.equal(headerMap['Cross-Origin-Opener-Policy'], 'same-origin-allow-popups');
assert.equal(headers.some((header) => header.key === 'Strict-Transport-Security'), false);
assert.match(mapView, /layer\.bindPopup\(window\.erstelleSicherenPopupInhalt\(properties\)\)/);
assert.doesNotMatch(mapView, /bindPopup\(`\$\{properties\.name/);
assert.match(fs.readFileSync(path.join(root, 'Code', 'backend', 'inject_version.js'), 'utf8'), /popup-content\\.js/);

global.document = {
    createElement(tagName) {
        return {
            tagName,
            children: [],
            textContent: '',
            append(...children) {
                this.children.push(...children);
            },
        };
    },
};

const {erstelleSicherenPopupInhalt} = require(path.join(root, 'Code', 'frontend', 'popup-content.js'));
const popup = erstelleSicherenPopupInhalt({
    name: '<img src=x onerror=alert(1)>',
    use_type: '<script>alert(1)</script>',
});

assert.equal(popup.children[0].textContent, '<img src=x onerror=alert(1)>');
assert.equal(popup.children[1].textContent, ' (<script>alert(1)</script>)');
