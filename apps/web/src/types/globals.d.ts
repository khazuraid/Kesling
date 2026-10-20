interface FormDataEntryValueMap {
  [key: string]: any;
}

interface FormData {
  get(name: string): any;
  getAll(name: string): any[];
  has(name: string): boolean;
  set(name: string, value: any, fileName?: string): void;
  append(name: string, value: any, fileName?: string): void;
  delete(name: string): void;
  entries(): IterableIterator<[string, any]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<any>;
  [Symbol.iterator](): IterableIterator<[string, any]>;
}
