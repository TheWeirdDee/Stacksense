;; VERSION: Clarity 4 (SIP-033/SIP-034)

(define-constant CONTRACT-OWNER 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV)

(define-map signal-tips
  { signal-id: (string-ascii 64) }
  { 
    tip-count: uint, 
    tip-total-ustx: uint,
    last-tip-timestamp: uint 
  }
)

(define-map signal-votes
  { signal-id: (string-ascii 64) }
  { bullish-votes: uint, bearish-votes: uint }
)

(define-map user-tipped
  { user: principal, signal-id: (string-ascii 64) }
  { amount: uint, timestamp: uint }
)

;; Uses Clarity 4 'stacks-block-time' for precise Unix timestamping
(define-public (tip-signal (signal-id (string-ascii 64)))
  (let (
    (tip-amount u1000000)
    (current-time stacks-block-time)
    (current (default-to
      { tip-count: u0, tip-total-ustx: u0, last-tip-timestamp: u0 }
      (map-get? signal-tips { signal-id: signal-id })
    ))
  )
    (try! (stx-transfer? tip-amount tx-sender CONTRACT-OWNER))
    (map-set signal-tips
      { signal-id: signal-id }
      {
        tip-count: (+ (get tip-count current) u1),
        tip-total-ustx: (+ (get tip-total-ustx current) tip-amount),
        last-tip-timestamp: current-time
      }
    )
    (map-set user-tipped
      { user: tx-sender, signal-id: signal-id }
      { amount: tip-amount, timestamp: current-time }
    )
    (ok true)
  )
)

(define-public (vote-bullish (signal-id (string-ascii 64)))
  (let (
    (current (default-to
      { bullish-votes: u0, bearish-votes: u0 }
      (map-get? signal-votes { signal-id: signal-id })
    ))
  )
    (map-set signal-votes
      { signal-id: signal-id }
      {
        bullish-votes: (+ (get bullish-votes current) u1),
        bearish-votes: (get bearish-votes current)
      }
    )
    (ok true)
  )
)

(define-public (vote-bearish (signal-id (string-ascii 64)))
  (let (
    (current (default-to
      { bullish-votes: u0, bearish-votes: u0 }
      (map-get? signal-votes { signal-id: signal-id })
    ))
  )
    (map-set signal-votes
      { signal-id: signal-id }
      {
        bullish-votes: (get bullish-votes current),
        bearish-votes: (+ (get bearish-votes current) u1)
      }
    )
    (ok true)
  )
)

(define-read-only (get-signal-tips (signal-id (string-ascii 64)))
  (default-to
    { tip-count: u0, tip-total-ustx: u0, last-tip-timestamp: u0 }
    (map-get? signal-tips { signal-id: signal-id })
  )
)

(define-read-only (get-signal-votes (signal-id (string-ascii 64)))
  (default-to
    { bullish-votes: u0, bearish-votes: u0 }
    (map-get? signal-votes { signal-id: signal-id })
  )
)

(define-read-only (has-user-tipped (user principal) (signal-id (string-ascii 64)))
  (is-some (map-get? user-tipped { user: user, signal-id: signal-id }))
)
