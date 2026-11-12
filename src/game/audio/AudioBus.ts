/** B00 deliberately silent until original licensed SFX are approved. */
export class AudioBus { constructor(public muted = false) {} setMuted(next: boolean) { this.muted = next; } destroy() {} }
