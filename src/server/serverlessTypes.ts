// Types minimaux pour une fonction serverless, limité à ce que le handler utilise.
// Vercel fournit l'implémentation réelle à l'exécution, ce qui évite de dépendre du
// paquet @vercel/node (lourd, et source d'alertes de sécurité cote outils de dev).
// Ils vivent dans src/server (et non dans api/) car Vercel traite chaque fichier de
// api/ comme une fonction : on ne garde donc dans api/ que la fonction elle-même.

export interface ServerlessRequest {
  query: Record<string, string | string[] | undefined>;
}

export interface ServerlessResponse {
  status(code: number): ServerlessResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}
