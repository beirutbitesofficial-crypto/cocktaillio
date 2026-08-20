declare module "cloudflare:workers" {
  type D1Result<T = unknown> = { results?: T[]; success: boolean; meta: { changes?: number } };
  type D1PreparedStatement = {
    bind(...values: unknown[]): D1PreparedStatement;
    run<T = unknown>(): Promise<D1Result<T>>;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
  };
  type D1Database = {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  };
  type R2ObjectBody = {
    body: ReadableStream;
    httpEtag: string;
    writeHttpMetadata(headers: Headers): void;
  };
  type R2Bucket = {
    put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(keys: string | string[]): Promise<void>;
  };
  export const env: { DB: D1Database; UPLOADS: R2Bucket };
}
