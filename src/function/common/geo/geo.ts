export type GeoProviderName = 'none' | 'maxmind-mmdb'

export type GeoDatasetAvailability = Readonly<{
  country: boolean
  city: boolean
  asn: boolean
}>

export type GeoDescriptor = Readonly<{
  provider: GeoProviderName
  availability: GeoDatasetAvailability
}>

export type GeoLookupResult = Readonly<{
  countryCode?: string
  regionCode?: string
  regionName?: string
  city?: string
  timezone?: string
  asn?: number
  asOrganization?: string
}>

export type Geo = {
  describe: () => GeoDescriptor
  lookupIp: (ipAddress: string) => Promise<GeoLookupResult | undefined>
}

export const createNoopGeo = (): Geo => ({
  describe: () => ({
    provider: 'none',
    availability: {
      country: false,
      city: false,
      asn: false,
    },
  }),
  lookupIp: async () => undefined,
})
