// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent) => {
    const data = event.data;

    if (typeof data.action === 'string' && data.action in actions) {
        actions[data.action](event);
    }
};


const actions: { [action: string]: ((e: MessageEvent) => Promise<any>) } = {
    'test': async e => { console.log('test action'); }
}

export {};