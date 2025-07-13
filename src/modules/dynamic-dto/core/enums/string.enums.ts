export const StringFormat = {
  // Basic formats
  EMAIL: 'email',
  URL: 'url',
  UUID: 'uuid',

  // Date/Time
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',

  // Communication
  PHONE: 'phone',
  MOBILE: 'mobile',

  // Network
  IPV4: 'ipv4',
  IPV6: 'ipv6',
  MAC_ADDRESS: 'mac_address',
  DOMAIN: 'domain',

  // Identity
  USERNAME: 'username',
  PASSWORD: 'password',

  // Data formats
  JSON: 'json',
  XML: 'xml',
  BASE64: 'base64',
  HEX: 'hex',

  // Financial
  CURRENCY: 'currency',
  CREDIT_CARD: 'credit_card',

  // Geographic
  COUNTRY_CODE: 'country_code',
  POSTAL_CODE: 'postal_code',
  COORDINATE: 'coordinate',

  // Technical
  SEMVER: 'semver',
  CRON: 'cron',

  // Markup
  HTML: 'html',
} as const;

export type StringFormat = (typeof StringFormat)[keyof typeof StringFormat];
