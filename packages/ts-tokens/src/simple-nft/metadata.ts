/**
 * Simple NFT Metadata Utilities
 */

import type { MetadataInput, SimpleMetadataObject } from './types'

/**
 * Parse metadata input to URI
 */
export async function parseMetadataInput(
  input: MetadataInput,
  uploadFn?: (data: unknown) => Promise<string>
): Promise<string> {
  // String - assume it's a URI
  if (typeof input === 'string') {
    return input
  }

  // Object with uri property
  if ('uri' in input && typeof input.uri === 'string') {
    return input.uri
  }

  // Local file path
  if ('file' in input) {
    if (!uploadFn) {
      throw new Error('Upload function required for file input')
    }
    // Would read file and upload
    return uploadFn(input.file)
  }

  // Full metadata object - needs to be uploaded
  if (!uploadFn) {
    throw new Error('Upload function required for metadata object')
  }

  const json = generateMetadataJSON(input as SimpleMetadataObject)
  return uploadFn(json)
}

/**
 * Generate standard metadata JSON
 */
export function generateMetadataJSON(metadata: SimpleMetadataObject): string {
  const json = {
    name: metadata.name,
    symbol: metadata.symbol ?? '',
    description: metadata.description ?? '',
    image: metadata.image,
    animation_url: metadata.animation_url,
    external_url: metadata.external_url,
    attributes: metadata.attributes ?? [],
    properties: metadata.properties ?? {
      files: metadata.image ? [{ uri: metadata.image, type: 'image/png' }] : [],
      category: 'image',
    },
  }

  return JSON.stringify(json, null, 2)
}

/**
 * Parse metadata JSON from URI
 */
export async function fetchMetadata(uri: string): Promise<SimpleMetadataObject> {
  const response = await fetch(uri)

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Validate metadata object
 */
export function validateMetadata(metadata: SimpleMetadataObject): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!metadata.name) errors.push('Missing name')
  if (!metadata.image) errors.push('Missing image')

  // Name length
  if (metadata.name && metadata.name.length > 32) {
    errors.push('Name exceeds 32 characters')
  }

  // Symbol length
  if (metadata.symbol && metadata.symbol.length > 10) {
    errors.push('Symbol exceeds 10 characters')
  }

  // Image URL
  if (metadata.image && !isValidUrl(metadata.image)) {
    errors.push('Invalid image URL')
  }

  // Warnings
  if (!metadata.description) {
    warnings.push('Missing description')
  }

  if (!metadata.attributes || metadata.attributes.length === 0) {
    warnings.push('No attributes defined')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check if string is valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * Generate metadata from simple inputs
 */
export function createMetadata(options: {
  name: string
  description?: string
  image: string
  attributes?: Array<{ trait: string; value: string | number }>
  externalUrl?: string
  animationUrl?: string
}): SimpleMetadataObject {
  return {
    name: options.name,
    description: options.description,
    image: options.image,
    external_url: options.externalUrl,
    animation_url: options.animationUrl,
    attributes: options.attributes?.map(a => ({
      trait_type: a.trait,
      value: a.value,
    })),
    properties: {
      files: [{ uri: options.image, type: 'image/png' }],
      category: options.animationUrl ? 'video' : 'image',
    },
  }
}

/**
 * Merge metadata updates
 */
export function mergeMetadata(
  existing: SimpleMetadataObject,
  updates: Partial<SimpleMetadataObject>
): SimpleMetadataObject {
  return {
    ...existing,
    ...updates,
    attributes: updates.attributes ?? existing.attributes,
    properties: {
      ...existing.properties,
      ...updates.properties,
    },
  }
}

/**
 * Extract attributes from metadata
 */
export function getAttributes(
  metadata: SimpleMetadataObject
): Map<string, string | number> {
  const attrs = new Map<string, string | number>()

  for (const attr of metadata.attributes ?? []) {
    attrs.set(attr.trait_type, attr.value)
  }

  return attrs
}

/**
 * Get attribute value
 */
export function getAttribute(
  metadata: SimpleMetadataObject,
  traitType: string
): string | number | undefined {
  return metadata.attributes?.find(a => a.trait_type === traitType)?.value
}

/**
 * Format metadata for display
 */
export function formatMetadata(metadata: SimpleMetadataObject): string {
  const lines = [
    `Name: ${metadata.name}`,
    metadata.symbol ? `Symbol: ${metadata.symbol}` : '',
    metadata.description ? `Description: ${metadata.description}` : '',
    `Image: ${metadata.image}`,
  ]

  if (metadata.attributes && metadata.attributes.length > 0) {
    lines.push('', 'Attributes:')
    for (const attr of metadata.attributes) {
      lines.push(`  ${attr.trait_type}: ${attr.value}`)
    }
  }

  return lines.filter(Boolean).join('\n')
}
