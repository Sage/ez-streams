import { _ } from 'streamline-runtime';

export function nextTick(cb: Function | _) {
    const anyCb: any = cb;
    if (/^0\./.test(process.versions.node)) setImmediate(cb);
    else process.nextTick(anyCb);
}