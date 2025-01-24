import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface MatchesFunction { (a: string | Uint8Array | Multiaddr): boolean }
export interface PartialMatchesFunction { (protos: string[]): boolean | string[] | null }

export interface Mafmt {
  toString: () => string
  input?: Array<(Mafmt | (() => Mafmt))>
  matches: MatchesFunction
  partialMatch: PartialMatchesFunction
}

/*
 * Valid combinations
 */
export const DNS4 = base('dns4')
export const DNS6 = base('dns6')
export const DNSADDR = base('dnsaddr')
export const DNS = or(
  base('dns'),
  DNSADDR,
  DNS4,
  DNS6
)

export const IP = or(base('ip4'), base('ip6'))
export const TCP = or(
  and(IP, base('tcp')),
  and(DNS, base('tcp'))
)
export const UDP = and(IP, base('udp'))
export const UTP = and(UDP, base('utp'))

export const QUIC = and(UDP, base('quic'))
export const QUICV1 = and(UDP, base('quic-v1'))

const _WebSockets = or(
  and(TCP, base('ws')),
  and(DNS, base('ws'))
)

export const WebSockets = or(
  and(_WebSockets, base('p2p')),
  _WebSockets
)

const _WebSocketsSecure = or(
  and(TCP, base('wss')),
  and(DNS, base('wss')),
  and(TCP, base('tls'), base('ws')),
  and(DNS, base('tls'), base('ws'))
)

export const WebSocketsSecure = or(
  and(_WebSocketsSecure, base('p2p')),
  _WebSocketsSecure
)

export const HTTP = or(
  and(TCP, base('http')),
  and(IP, base('http')),
  and(DNS, base('http'))
)

export const HTTPS = or(
  and(TCP, base('https')),
  and(IP, base('https')),
  and(DNS, base('https'))
)

const _WebRTCDirect = and(UDP, base('webrtc-direct'), base('certhash'))
export const WebRTCDirect = or(
  and(_WebRTCDirect, base('p2p')),
  _WebRTCDirect
)

const _WebTransport = and(QUICV1, base('webtransport'), base('certhash'), base('certhash'))
export const WebTransport = or(
  and(_WebTransport, base('p2p')),
  _WebTransport
)

/**
 * @deprecated
 */
export const P2PWebRTCStar = or(
  and(WebSockets, base('p2p-webrtc-star'), base('p2p')),
  and(WebSocketsSecure, base('p2p-webrtc-star'), base('p2p')),
  and(WebSockets, base('p2p-webrtc-star')),
  and(WebSocketsSecure, base('p2p-webrtc-star'))
)

export const WebSocketStar = or(
  and(WebSockets, base('p2p-websocket-star'), base('p2p')),
  and(WebSocketsSecure, base('p2p-websocket-star'), base('p2p')),
  and(WebSockets, base('p2p-websocket-star')),
  and(WebSocketsSecure, base('p2p-websocket-star'))
)

/**
 * @deprecated
 */
export const P2PWebRTCDirect = or(
  and(HTTP, base('p2p-webrtc-direct'), base('p2p')),
  and(HTTPS, base('p2p-webrtc-direct'), base('p2p')),
  and(HTTP, base('p2p-webrtc-direct')),
  and(HTTPS, base('p2p-webrtc-direct'))
)

export const Reliable = or(
  _WebSockets,
  _WebSocketsSecure,
  HTTP,
  HTTPS,
  P2PWebRTCStar,
  P2PWebRTCDirect,
  TCP,
  UTP,
  QUIC,
  DNS,
  WebRTCDirect,
  WebTransport
)

// Unlike ws-star, stardust can run over any transport thus removing the requirement for websockets (but don't even think about running a stardust server over webrtc-star ;) )
export const Stardust = or(
  and(Reliable, base('p2p-stardust'), base('p2p')),
  and(Reliable, base('p2p-stardust'))
)

const _P2P = or(
  and(Reliable, base('p2p')),
  P2PWebRTCStar,
  P2PWebRTCDirect,
  WebRTCDirect,
  WebTransport,
  base('p2p')
)

const _Circuit = or(
  and(_P2P, base('p2p-circuit'), _P2P),
  and(_P2P, base('p2p-circuit')),
  and(base('p2p-circuit'), _P2P),
  and(Reliable, base('p2p-circuit')),
  and(base('p2p-circuit'), Reliable),
  base('p2p-circuit')
)

const CircuitRecursive = (): Mafmt => or(
  and(_Circuit, CircuitRecursive),
  _Circuit
)

export const Circuit = CircuitRecursive()

export const P2P = or(
  and(Circuit, _P2P, Circuit),
  and(_P2P, Circuit),
  and(Circuit, _P2P),
  Circuit,
  _P2P
)

export const IPFS = P2P

export const WebRTC = or(
  and(Circuit, base('webrtc'), base('p2p')),
  and(Circuit, base('webrtc')),
  and(Reliable, base('webrtc'), base('p2p')),
  and(Reliable, base('webrtc')),
  base('webrtc')
)

/*
 * Validation funcs
 */

function makeMatchesFunction (partialMatch: PartialMatchesFunction): (a: string | Uint8Array | Multiaddr) => boolean {
  function matches (a: string | Uint8Array | Multiaddr): boolean {
    let ma

    try {
      ma = multiaddr(a)
    } catch (err: any) { // catch error
      return false // also if it's invalid it's probably not matching as well so return false
    }

    const out = partialMatch(ma.protoNames())
    if (out === null) {
      return false
    }

    if (out === true || out === false) {
      return out
    }

    return out.length === 0
  }

  return matches
}

function and (...args: Array<Mafmt | (() => Mafmt)>): Mafmt {
  function partialMatch (a: string[]): boolean | string[] | null {
    if (a.length < args.length) {
      return null
    }

    let out: boolean | string[] | null = a

    args.some((arg) => {
      out = typeof arg === 'function'
        ? arg().partialMatch(a)
        : arg.partialMatch(a)

      if (Array.isArray(out)) {
        a = out
      }

      if (out === null) {
        return true
      }

      return false
    })

    return out
  }

  return {
    toString: function () { return '{ ' + args.join(' ') + ' }' },
    input: args,
    matches: makeMatchesFunction(partialMatch),
    partialMatch
  }
}

function or (...args: Array<Mafmt | (() => Mafmt)>): Mafmt {
  function partialMatch (a: string[]): boolean | string[] | null {
    let out = null
    args.some((arg) => {
      const res = typeof arg === 'function'
        ? arg().partialMatch(a)
        : arg.partialMatch(a)
      if (res != null) {
        out = res
        return true
      }
      return false
    })

    return out
  }

  const result = {
    toString: function () { return '{ ' + args.join(' ') + ' }' },
    input: args,
    matches: makeMatchesFunction(partialMatch),
    partialMatch
  }

  return result
}

function base (n: string): Mafmt {
  const name = n

  function matches (a: string | Uint8Array | Multiaddr): boolean {
    let ma: Multiaddr

    try {
      ma = multiaddr(a)
    } catch (err: any) { // catch error
      return false // also if it's invalid it's probably not matching as well so return false
    }

    const pnames = ma.protoNames()
    if (pnames.length === 1 && pnames[0] === name) {
      return true
    }
    return false
  }

  function partialMatch (protos: string[]): boolean | string[] | null {
    if (protos.length === 0) {
      return null
    }

    if (protos[0] === name) {
      return protos.slice(1)
    }
    return null
  }

  return {
    toString: function () { return name },
    matches,
    partialMatch
  }
}
