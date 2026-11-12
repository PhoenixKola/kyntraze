export class Pool<T> {
  private available: T[] = [];
  constructor(private readonly factory: () => T, private readonly reset: (item: T) => void, initial = 0) { for (let i = 0; i < initial; i++) this.available.push(factory()); }
  acquire(): T { return this.available.pop() ?? this.factory(); }
  release(item: T) { this.reset(item); this.available.push(item); }
  get freeCount() { return this.available.length; }
}
