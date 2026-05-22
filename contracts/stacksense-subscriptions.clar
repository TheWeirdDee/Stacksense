;; StackSense API Subscription Contract
;; Manages paid API tiers and webhook access

(define-constant CONTRACT-OWNER 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV)
(define-constant ERR-UNAUTHORIZED u1001)
(define-constant ERR-INVALID-TIER u1002)
(define-constant ERR-ALREADY-SUBSCRIBED u1003)
(define-constant ERR-SUBSCRIPTION-EXPIRED u1004)

;; Subscription tiers with costs and limits
(define-constant TIER-FREE u0)
(define-constant TIER-PRO u1)
(define-constant TIER-ENTERPRISE u2)

(define-constant TIER-PRO-COST u1000000)      ;; 1 STX/month
(define-constant TIER-ENTERPRISE-COST u10000000) ;; 10 STX/month

(define-constant SUBSCRIPTION-DURATION u2592000) ;; 30 days in seconds

(define-map subscriptions
  { subscriber: principal }
  { 
    tier: uint,
    start-block: uint,
    expires-at: uint,
    api-key: (buff 32),
    webhook-url: (string-utf8 255),
    requests-used: uint
  }
)

(define-map tier-limits
  { tier: uint }
  {
    requests-per-month: uint,
    webhook-enabled: bool,
    priority-support: bool,
    custom-rules: bool
  }
)

;; Initialize tier limits
(define-public (init-tiers)
  (begin
    (map-set tier-limits { tier: TIER-FREE } 
      { requests-per-month: u1000, webhook-enabled: false, priority-support: false, custom-rules: false })
    (map-set tier-limits { tier: TIER-PRO } 
      { requests-per-month: u100000, webhook-enabled: true, priority-support: false, custom-rules: false })
    (map-set tier-limits { tier: TIER-ENTERPRISE } 
      { requests-per-month: u1000000, webhook-enabled: true, priority-support: true, custom-rules: true })
    (ok true)
  )
)

;; Subscribe to Pro tier
(define-public (subscribe-pro (api-key (buff 32)))
  (let (
    (current-block block-height)
    (expires (+ stacks-block-time SUBSCRIPTION-DURATION))
  )
    (try! (stx-transfer? TIER-PRO-COST tx-sender CONTRACT-OWNER))
    (map-set subscriptions
      { subscriber: tx-sender }
      {
        tier: TIER-PRO,
        start-block: current-block,
        expires-at: expires,
        api-key: api-key,
        webhook-url: u"",
        requests-used: u0
      }
    )
    (ok { tier: TIER-PRO, expires-at: expires })
  )
)

;; Subscribe to Enterprise tier
(define-public (subscribe-enterprise (api-key (buff 32)) (webhook-url (string-utf8 255)))
  (let (
    (current-block block-height)
    (expires (+ stacks-block-time SUBSCRIPTION-DURATION))
  )
    (try! (stx-transfer? TIER-ENTERPRISE-COST tx-sender CONTRACT-OWNER))
    (map-set subscriptions
      { subscriber: tx-sender }
      {
        tier: TIER-ENTERPRISE,
        start-block: current-block,
        expires-at: expires,
        api-key: api-key,
        webhook-url: webhook-url,
        requests-used: u0
      }
    )
    (ok { tier: TIER-ENTERPRISE, expires-at: expires })
  )
)

;; Renew subscription
(define-public (renew-subscription (tier uint))
  (let (
    (current (unwrap! (map-get? subscriptions { subscriber: tx-sender }) (err ERR-UNAUTHORIZED)))
    (cost (if (is-eq tier TIER-PRO) TIER-PRO-COST TIER-ENTERPRISE-COST))
    (expires (+ stacks-block-time SUBSCRIPTION-DURATION))
  )
    (asserta (is-eq (get tier current) tier) (err ERR-INVALID-TIER))
    (try! (stx-transfer? cost tx-sender CONTRACT-OWNER))
    (map-set subscriptions
      { subscriber: tx-sender }
      (merge current { expires-at: expires, requests-used: u0 })
    )
    (ok { tier: tier, expires-at: expires })
  )
)

;; Log API request usage
(define-public (log-request (subscriber principal))
  (let (
    (sub (unwrap! (map-get? subscriptions { subscriber: subscriber }) (err ERR-UNAUTHORIZED)))
  )
    (asserta (< stacks-block-time (get expires-at sub)) (err ERR-SUBSCRIPTION-EXPIRED))
    (map-set subscriptions
      { subscriber: subscriber }
      (merge sub { requests-used: (+ (get requests-used sub) u1) })
    )
    (ok true)
  )
)

;; Get subscription info
(define-read-only (get-subscription (subscriber principal))
  (map-get? subscriptions { subscriber: subscriber })
)

;; Get tier limits
(define-read-only (get-tier-limits (tier uint))
  (map-get? tier-limits { tier: tier })
)

;; Check if subscription is active
(define-read-only (is-subscription-active (subscriber principal))
  (match (map-get? subscriptions { subscriber: subscriber })
    sub (< stacks-block-time (get expires-at sub))
    false
  )
)

;; Withdraw contract revenue
(define-public (withdraw (amount uint))
  (begin
    (asserta (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
    (try! (stx-transfer? amount CONTRACT-OWNER tx-sender))
    (ok true)
  )
)
;; PR: auto-generated branch pr/subscriptions-contract
