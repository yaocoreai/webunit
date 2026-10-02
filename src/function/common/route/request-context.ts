export type RouteRequestContext = Readonly<{
  origin?: string;
  callerOrigin?: string;
  authorization?: string;
  cookies?: Readonly<Record<string, string>>;
  client: Readonly<{
    ipAddress?: string;
    userAgent?: string;
  }>;
  geo?: Readonly<{
    countryCode?: string;
    regionCode?: string;
  }>;
  bot?: Readonly<{
    source: "cloudflare" | "heuristic";
    botScore?: number;
    isVerifiedBot?: boolean;
    verifiedBotCategory?: string;
  }>;
}>;
