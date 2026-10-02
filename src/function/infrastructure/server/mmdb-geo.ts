import { isIP } from 'node:net'
import { AddressNotFoundError, Reader } from '@maxmind/geoip2-node'
import { createNoopGeo, type Geo, type GeoLookupResult } from '@/function/common/geo'

type NodeMmdbReader = Awaited<ReturnType<typeof Reader.open>>

export type NodeMmdbGeoOptions = Readonly<{
  countryDbPath?: string
  cityDbPath?: string
  asnDbPath?: string
  openReader?: (filePath: string) => Promise<NodeMmdbReader>
}>

type ReaderLoader = {
  configured: boolean
  load: () => Promise<NodeMmdbReader | undefined>
}

export const createNodeMmdbGeo = (
  options: NodeMmdbGeoOptions = {},
): Geo => {
  const availability = {
    country: Boolean(options.countryDbPath || options.cityDbPath),
    city: Boolean(options.cityDbPath),
    asn: Boolean(options.asnDbPath),
  }

  if (!availability.country && !availability.city && !availability.asn) {
    return createNoopGeo()
  }

  const openReader = options.openReader ?? ((filePath: string) => Reader.open(filePath))
  const countryReader = createReaderLoader(options.countryDbPath, openReader)
  const cityReader = createReaderLoader(options.cityDbPath, openReader)
  const asnReader = createReaderLoader(options.asnDbPath, openReader)

  return {
    describe: () => ({
      provider: 'maxmind-mmdb',
      availability,
    }),
    lookupIp: async (ipAddress) => {
      if (isIP(ipAddress) === 0) {
        return undefined
      }

      const city = await lookupCity(cityReader, ipAddress)
      const country = city ? undefined : await lookupCountry(countryReader, ipAddress)
      const asn = await lookupAsn(asnReader, ipAddress)
      const result = mergeLookupResult(
        city ? mapCityLookup(city) : undefined,
        country ? mapCountryLookup(country) : undefined,
        asn ? mapAsnLookup(asn) : undefined,
      )

      return hasLookupResult(result) ? result : undefined
    },
  }
}

const createReaderLoader = (
  filePath: string | undefined,
  openReader: (filePath: string) => Promise<NodeMmdbReader>,
): ReaderLoader => {
  if (!filePath) {
    return {
      configured: false,
      load: async () => undefined,
    }
  }

  let readerPromise: Promise<NodeMmdbReader> | undefined

  return {
    configured: true,
    load: async () => {
      readerPromise ??= openReader(filePath)
      return readerPromise
    },
  }
}

const lookupCity = async (
  loader: ReaderLoader,
  ipAddress: string,
) => {
  return lookupReader(loader, (reader) => reader.city(ipAddress))
}

const lookupCountry = async (
  loader: ReaderLoader,
  ipAddress: string,
) => {
  return lookupReader(loader, (reader) => reader.country(ipAddress))
}

const lookupAsn = async (
  loader: ReaderLoader,
  ipAddress: string,
) => {
  return lookupReader(loader, (reader) => reader.asn(ipAddress))
}

const lookupReader = async <TResult>(
  loader: ReaderLoader,
  execute: (reader: NodeMmdbReader) => TResult,
): Promise<TResult | undefined> => {
  if (!loader.configured) {
    return undefined
  }

  const reader = await loader.load()

  if (!reader) {
    return undefined
  }

  try {
    return execute(reader)
  } catch (error) {
    if (error instanceof AddressNotFoundError) {
      return undefined
    }

    throw error
  }
}

const mapCityLookup = (
  result: Awaited<ReturnType<NodeMmdbReader['city']>>,
): GeoLookupResult => ({
  countryCode: normalizeCountryCode(result.country?.isoCode),
  regionCode: normalizeString(result.subdivisions?.[0]?.isoCode),
  regionName: readLocalizedName(result.subdivisions?.[0]),
  city: readLocalizedName(result.city),
  timezone: normalizeString(result.location?.timeZone),
})

const mapCountryLookup = (
  result: Awaited<ReturnType<NodeMmdbReader['country']>>,
): GeoLookupResult => ({
  countryCode: normalizeCountryCode(result.country?.isoCode),
})

const mapAsnLookup = (
  result: Awaited<ReturnType<NodeMmdbReader['asn']>>,
): GeoLookupResult => ({
  asn: result.autonomousSystemNumber,
  asOrganization: normalizeString(result.autonomousSystemOrganization),
})

const mergeLookupResult = (
  ...results: Array<GeoLookupResult | undefined>
): GeoLookupResult => {
  return results.reduce<GeoLookupResult>((merged, result) => {
    if (!result) {
      return merged
    }

    return {
      ...merged,
      ...result,
    }
  }, {})
}

const hasLookupResult = (result: GeoLookupResult) => {
  return Object.values(result).some((value) => value !== undefined)
}

const readLocalizedName = (record: { names?: { en?: string } } | undefined) => {
  return normalizeString(record?.names?.en)
}

const normalizeCountryCode = (value: string | undefined) => {
  const normalized = normalizeString(value)
  return normalized ? normalized.toUpperCase() : undefined
}

const normalizeString = (value: string | undefined) => {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}
