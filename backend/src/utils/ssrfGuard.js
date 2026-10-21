import dns from 'dns/promises';
import { isIP } from 'net';

/**
 * Checks if an IPv4 or IPv6 address belongs to private, loopback, or reserved ranges.
 */
export function isPrivateOrReservedIP(ipAddress) {
  if (!ipAddress) return true;

  // IPv4 Checks
  if (ipAddress.startsWith('127.')) return true; // Loopback
  if (ipAddress === '0.0.0.0') return true;
  if (ipAddress === '169.254.169.254') return true; // Cloud metadata service (AWS/Azure/GCP)
  if (ipAddress.startsWith('169.254.')) return true; // Link-local
  if (ipAddress.startsWith('10.')) return true; // Class A private
  if (ipAddress.startsWith('192.168.')) return true; // Class C private

  // Class B private: 172.16.0.0 - 172.31.255.255
  if (ipAddress.startsWith('172.')) {
    const parts = ipAddress.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }

  // IPv6 Checks
  if (ipAddress === '::1' || ipAddress === '::') return true; // IPv6 Loopback
  if (ipAddress.toLowerCase().startsWith('fe80:')) return true; // IPv6 Link-local
  if (ipAddress.toLowerCase().startsWith('fc00:') || ipAddress.toLowerCase().startsWith('fd00:')) return true; // Unique local

  return false;
}

/**
 * Validates a target URL against SSRF attacks.
 * Resolves hostname to ensure it does not point to internal infrastructure or cloud metadata.
 */
export async function validateTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Invalid protocol. Only HTTP and HTTPS are permitted.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard loopback hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, error: 'Access to local / internal hostnames is prohibited (SSRF Guard).' };
  }

  // If hostname is directly an IP address
  if (isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return { valid: false, error: `Access to private/reserved IP address ${hostname} is prohibited (SSRF Guard).` };
    }
    return { valid: true, url: parsed.href };
  }

  // Resolve hostname via DNS to prevent DNS rebinding
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          valid: false,
          error: `Hostname ${hostname} resolves to private IP (${record.address}). Request blocked by SSRF Guard.`
        };
      }
    }
  } catch (err) {
    return { valid: false, error: `DNS resolution failed for host ${hostname}: ${err.message}` };
  }

  return { valid: true, url: parsed.href };
}

export default { isPrivateOrReservedIP, validateTargetUrl };
