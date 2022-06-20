if (!globalThis.atob) {
    globalThis.atob = a => Buffer.from(a, 'base64').toString('binary');
}

if (!globalThis.btoa) {
    globalThis.btoa = b => Buffer.from(b).toString('base64')
}
