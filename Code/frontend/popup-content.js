function erstelleSicherenPopupInhalt(properties) {
    const popup = document.createElement('div');
    const name = document.createElement('span');
    const type = document.createElement('span');

    name.textContent = properties?.name || '-';
    type.textContent = ` (${properties?.use_type || '-'})`;
    popup.append(name, type);

    return popup;
}

if (typeof window !== 'undefined') {
    window.erstelleSicherenPopupInhalt = erstelleSicherenPopupInhalt;
}

if (typeof module !== 'undefined') {
    module.exports = {erstelleSicherenPopupInhalt};
}
