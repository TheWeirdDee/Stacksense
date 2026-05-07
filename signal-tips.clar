;; StackSense Signal Tips Contract
;; Stores signal tips and votes on-chain

(define-map signal-tips
  { signal-id: (string-ascii 36) }
  { total-tips: uint, bullish-votes: uint, bearish-votes: uint }
)

(define-map wallet-reputation
  { sender: principal }
  { tip-count: uint, vote-count: uint }
)

;; Public Functions

(define-public (tip-signal (signal-id (string-ascii 36)))
  (let
    (
      (current-stats (default-to { total-tips: u0, bullish-votes: u0, bearish-votes: u0 } (map-get? signal-tips { signal-id: signal-id })))
      (current-reputation (default-to { tip-count: u0, vote-count: u0 } (map-get? wallet-reputation { sender: tx-sender })))
    )
    ;; Transfer 1 STX to treasury
    (try! (stx-transfer? u1000000 tx-sender 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RV))
    
    ;; Update maps
    (map-set signal-tips 
      { signal-id: signal-id }
      (merge current-stats { total-tips: (+ (get total-tips current-stats) u1) })
    )
    (map-set wallet-reputation
      { sender: tx-sender }
      (merge current-reputation { tip-count: (+ (get tip-count current-reputation) u1) })
    )
    (ok true)
  )
)

(define-public (vote-signal (signal-id (string-ascii 36)) (is-bullish bool))
  (let
    (
      (current-stats (default-to { total-tips: u0, bullish-votes: u0, bearish-votes: u0 } (map-get? signal-tips { signal-id: signal-id })))
      (current-reputation (default-to { tip-count: u0, vote-count: u0 } (map-get? wallet-reputation { sender: tx-sender })))
    )
    (map-set signal-tips 
      { signal-id: signal-id }
      (if is-bullish
        (merge current-stats { bullish-votes: (+ (get bullish-votes current-stats) u1) })
        (merge current-stats { bearish-votes: (+ (get bearish-votes current-stats) u1) })
      )
    )
    (map-set wallet-reputation
      { sender: tx-sender }
      (merge current-reputation { vote-count: (+ (get vote-count current-reputation) u1) })
    )
    (ok true)
  )
)

;; Read-only Functions

(define-read-only (get-signal-stats (signal-id (string-ascii 36)))
  (ok (default-to { total-tips: u0, bullish-votes: u0, bearish-votes: u0 } (map-get? signal-tips { signal-id: signal-id })))
)

(define-read-only (get-reputation (address principal))
  (ok (default-to { tip-count: u0, vote-count: u0 } (map-get? wallet-reputation { sender: address })))
)
