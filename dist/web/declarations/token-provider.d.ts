export interface TokenProvider {
    fetchToken(tokenParams?: any): Promise<string>;
    clearToken(token?: string): void;
}
